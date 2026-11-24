"""
Svetofor boshqaruvi va soya (shadow) navbat simulyatsiyasi

SignalController — bitta chorrahaning fazalar mashinasi:
    yashil (15/30 s) → sariq 3 s → hamma qizil 2 s → boshqa o'qqa yashil.
    Yashil tugaganda boshqaruvchi keyingi harakatni tanlaydi; o'sha o'q
    qayta tanlansa, yashil uzaytiriladi (sariq/qizil yo'qotishsiz).

QueueModel — taqqoslash uchun yengil nuqtaviy navbat (FIFO):
    kelgan mashinalar navbatga qo'shiladi, yashilda 0.5 mashina/s o'tadi
    (notebook'dagi 15 mashina / 30 s bilan bir xil). Har bir mashinaning
    kutish vaqti alohida hisoblanadi.
"""

from collections import deque
from typing import Callable, Deque, Dict, Optional, Tuple

import numpy as np

from src.ai.dqn_policy import ACTIONS, DQNPolicy, make_state

YELLOW_S = 3.0
ALLRED_S = 2.0
FIXED_GREEN_S = 30.0       # fiks taymer: har yo'nalishga 30 s
SATURATION_FLOW = 0.5      # mashina/s yashilda
WAIT_WINDOW_S = 300.0      # o'rtacha kutish oynasi (5 daqiqa simulyatsiya vaqti)
PREEMPT_HOLD_S = 5.0       # tez yordam uchun yashil shu bo'laklarda ushlab turiladi
MAX_GREEN_S = 90.0         # config.yaml: traffic_signals.max_green_time

AXES = ("NS", "EW")


def other_axis(axis: str) -> str:
    return "EW" if axis == "NS" else "NS"


class SignalController:
    """
    decide(controller) → (o'q, yashil davomiyligi) — har bir yashil oxirida chaqiriladi.
    """

    def __init__(self, decide: Callable[["SignalController"], Tuple[str, float]],
                 phase: str = "NS", initial_green: float = FIXED_GREEN_S):
        self.decide = decide
        self.phase = phase
        self.state = "green"
        self.remaining = initial_green
        self.decisions = 0
        self.green_time = 0.0            # joriy o'q qancha vaqtdan beri yashil
        self.preempt_axis: Optional[str] = None
        self._pending: Tuple[str, float] = (phase, initial_green)

    def tick(self, dt: float) -> bool:
        """dt soniya o'tkazadi. Yangi o'qqa yashil yoqilgan bo'lsa True."""
        switched = False
        if self.state == "green":
            self.green_time += dt
        self.remaining -= dt
        while self.remaining <= 0:
            if self.state == "green":
                axis, duration = self._next()
                if axis == self.phase:
                    self.remaining += duration
                else:
                    self._pending = (axis, duration)
                    self.state = "yellow"
                    self.remaining += YELLOW_S
            elif self.state == "yellow":
                self.state = "allred"
                self.remaining += ALLRED_S
            else:
                axis, duration = self._pending
                if self.preempt_axis:
                    axis, duration = self.preempt_axis, PREEMPT_HOLD_S
                self.phase, self.state = axis, "green"
                self.remaining += duration
                self.green_time = 0.0
                switched = True
        return switched

    def _next(self) -> Tuple[str, float]:
        if self.preempt_axis:
            return self.preempt_axis, PREEMPT_HOLD_S
        self.decisions += 1
        return self.decide(self)

    def preempt(self, axis: Optional[str]):
        """Tez yordam uchun o'qni majburan yashil qilish (None — bekor qilish)."""
        if axis and axis != self.preempt_axis and self.state == "green" and self.phase != axis:
            self.remaining = 0.0          # keyingi tick'da sariqqa o'tadi
        self.preempt_axis = axis

    def is_green(self, axis: str) -> bool:
        return self.state == "green" and self.phase == axis


def fixed_decide(controller: SignalController) -> Tuple[str, float]:
    return other_axis(controller.phase), FIXED_GREEN_S


def dqn_decide(policy: DQNPolicy, controller: SignalController,
               ns_queue: int, ew_queue: int) -> Tuple[str, float, int, np.ndarray, bool]:
    """
    DQN qarori + maksimal yashil cheklovi.
    Qaytaradi: (o'q, yashil s, DQN harakati, Q-qiymatlar, cheklov ishladimi).
    Agar DQN joriy yashilni uzaytirib uni 90 s dan oshirmoqchi bo'lsa va qarama-qarshi
    o'qda kutayotgan mashina bo'lsa, yashil boshqa o'qqa beriladi.
    """
    q = policy.q_values(make_state(ns_queue, ew_queue, controller.decisions))
    action = int(np.argmax(q))
    axis, green = ACTIONS[action]
    waiting_other = ew_queue if controller.phase == "NS" else ns_queue
    guarded = (axis == controller.phase and waiting_other > 0
               and controller.green_time + green > MAX_GREEN_S)
    if guarded:
        axis = other_axis(axis)
    return axis, float(green), action, q, guarded


class QueueModel:
    """Bitta chorraha, bitta boshqaruvchi uchun soya navbat simulyatsiyasi."""

    def __init__(self, policy: Optional[DQNPolicy]):
        """policy=None — fiks taymer, aks holda DQN."""
        self.queues: Dict[str, Deque[float]] = {a: deque() for a in AXES}
        self.served: Deque[Tuple[float, float]] = deque()   # (ketish vaqti, kutish)
        self.arrived = 0                                    # jami kelgan mashinalar
        self._credit = 0.0
        self._policy = policy
        decide = self._dqn_decide if policy else fixed_decide
        self.controller = SignalController(decide)

    def _dqn_decide(self, controller: SignalController) -> Tuple[str, float]:
        axis, green, *_ = dqn_decide(self._policy, controller,
                                     len(self.queues["NS"]), len(self.queues["EW"]))
        return axis, green

    def tick(self, now: float, arrivals: Dict[str, int], dt: float = 1.0):
        for axis, count in arrivals.items():
            self.queues[axis].extend([now] * count)
            self.arrived += count
        self.controller.tick(dt)
        if self.controller.state == "green":
            queue = self.queues[self.controller.phase]
            self._credit += SATURATION_FLOW * dt
            while self._credit >= 1.0 and queue:
                self.served.append((now, now - queue.popleft()))
                self._credit -= 1.0
            if not queue:
                self._credit = min(self._credit, 1.0)
        else:
            self._credit = 0.0
        while self.served and self.served[0][0] < now - WAIT_WINDOW_S:
            self.served.popleft()

    def wait_samples(self, now: float):
        """Oynadagi o'tgan mashinalar kutishi + hali navbatdagilarning joriy kutishi."""
        yield from (w for _, w in self.served)
        for queue in self.queues.values():
            yield from (now - t for t in queue)
