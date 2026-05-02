"""
Svetofor Optimallashtiruvchisi

Q-Learning asosida svetofor vaqtlarini optimallashtirish
"""

import numpy as np
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
import random


class SignalPhase(Enum):
    """Svetofor fazalari"""
    NORTH_SOUTH_GREEN = "ns_green"
    EAST_WEST_GREEN = "ew_green"
    ALL_RED = "all_red"
    EMERGENCY = "emergency"


@dataclass
class IntersectionState:
    """Chorraha holati"""
    intersection_id: str
    north_queue: int = 0
    south_queue: int = 0
    east_queue: int = 0
    west_queue: int = 0
    current_phase: SignalPhase = SignalPhase.NORTH_SOUTH_GREEN
    phase_time_remaining: int = 30
    waiting_time_total: float = 0.0
    
    @property
    def total_queue(self) -> int:
        return self.north_queue + self.south_queue + self.east_queue + self.west_queue
    
    def get_state_tuple(self) -> tuple:
        """Q-table uchun state"""
        # Discretize queue lengths (0-2: low, 3-5: medium, 6+: high)
        def discretize(q):
            if q <= 2: return 0
            if q <= 5: return 1
            return 2
        
        return (
            discretize(self.north_queue),
            discretize(self.south_queue),
            discretize(self.east_queue),
            discretize(self.west_queue),
            self.current_phase.value
        )


@dataclass
class SignalTiming:
    """Svetofor vaqtlari"""
    ns_green: int = 30  # Shimol-Janub uchun yashil
    ew_green: int = 30  # Sharq-G'arb uchun yashil
    yellow: int = 3
    all_red: int = 2
    
    @property
    def cycle_time(self) -> int:
        return self.ns_green + self.ew_green + 2 * self.yellow + 2 * self.all_red


class SignalOptimizer:
    """
    Svetofor Optimallashtiruvchisi
    
    Q-Learning algoritmi yordamida svetofor vaqtlarini
    real vaqtda optimallashtirad.
    """
    
    # Vaqt parametrlari
    MIN_GREEN = 15
    MAX_GREEN = 90
    GREEN_STEP = 5
    
    def __init__(self, 
                 learning_rate: float = 0.1,
                 discount_factor: float = 0.95,
                 epsilon: float = 0.1):
        """
        SignalOptimizer yaratish
        
        Args:
            learning_rate: O'rganish tezligi
            discount_factor: Chegirma koeffitsienti
            epsilon: Epsilon-greedy exploration
        """
        self.lr = learning_rate
        self.gamma = discount_factor
        self.epsilon = epsilon
        
        # Q-table: {(state, action): value}
        self.q_table: Dict[Tuple, float] = {}
        
        # Har bir chorrahaning hozirgi vaqtlari
        self.current_timings: Dict[str, SignalTiming] = {}
        
        # Statistika
        self.stats = {
            "total_optimizations": 0,
            "explorations": 0,
            "exploitations": 0
        }
    
    def get_actions(self) -> List[Tuple[int, int]]:
        """Mumkin bo'lgan harakatlar (ns_green, ew_green)"""
        actions = []
        for ns in range(self.MIN_GREEN, self.MAX_GREEN + 1, self.GREEN_STEP):
            for ew in range(self.MIN_GREEN, self.MAX_GREEN + 1, self.GREEN_STEP):
                actions.append((ns, ew))
        return actions
    
    def get_q_value(self, state: tuple, action: tuple) -> float:
        """Q-value olish"""
        return self.q_table.get((state, action), 0.0)
    
    def set_q_value(self, state: tuple, action: tuple, value: float):
        """Q-value o'rnatish"""
        self.q_table[(state, action)] = value
    
    def choose_action(self, state: IntersectionState) -> Tuple[int, int]:
        """
        Epsilon-greedy action selection
        
        Args:
            state: Chorraha holati
        
        Returns:
            (ns_green, ew_green) tuple
        """
        state_tuple = state.get_state_tuple()
        actions = self.get_actions()
        
        if random.random() < self.epsilon:
            # Exploration
            self.stats["explorations"] += 1
            return random.choice(actions)
        else:
            # Exploitation
            self.stats["exploitations"] += 1
            best_action = max(actions, key=lambda a: self.get_q_value(state_tuple, a))
            return best_action
    
    def calculate_reward(self, state: IntersectionState, 
                         action: Tuple[int, int]) -> float:
        """
        Reward hisoblash
        
        Reward = -total_waiting_time - imbalance_penalty + throughput_bonus
        """
        ns_green, ew_green = action
        
        # Kutish vaqti penalty
        waiting_penalty = -state.waiting_time_total
        
        # Navbat balansiga qarab penalty
        ns_queue = state.north_queue + state.south_queue
        ew_queue = state.east_queue + state.west_queue
        
        # Yashil vaqt va navbat proporsiyasi
        if ns_queue + ew_queue > 0:
            optimal_ns_ratio = ns_queue / (ns_queue + ew_queue)
            actual_ns_ratio = ns_green / (ns_green + ew_green)
            imbalance_penalty = -abs(optimal_ns_ratio - actual_ns_ratio) * 50
        else:
            imbalance_penalty = 0
        
        # Throughput bonus (taxminiy)
        throughput = min(ns_green, ns_queue * 2) + min(ew_green, ew_queue * 2)
        throughput_bonus = throughput * 0.5
        
        return waiting_penalty + imbalance_penalty + throughput_bonus
    
    def update(self, state: IntersectionState, action: Tuple[int, int],
               reward: float, next_state: IntersectionState):
        """
        Q-value yangilash (Q-Learning update rule)
        """
        state_tuple = state.get_state_tuple()
        next_state_tuple = next_state.get_state_tuple()
        
        # Maksimal keyingi Q-value
        actions = self.get_actions()
        max_next_q = max(self.get_q_value(next_state_tuple, a) for a in actions)
        
        # Q-Learning formula
        current_q = self.get_q_value(state_tuple, action)
        new_q = current_q + self.lr * (reward + self.gamma * max_next_q - current_q)
        
        self.set_q_value(state_tuple, action, new_q)
    
    def optimize(self, state: IntersectionState) -> SignalTiming:
        """
        Svetofor vaqtlarini optimallashtirish
        
        Args:
            state: Chorraha holati
        
        Returns:
            Optimallashtirilgan vaqtlar
        """
        action = self.choose_action(state)
        ns_green, ew_green = action
        
        timing = SignalTiming(
            ns_green=ns_green,
            ew_green=ew_green
        )
        
        self.current_timings[state.intersection_id] = timing
        self.stats["total_optimizations"] += 1
        
        return timing
    
    def optimize_proportional(self, state: IntersectionState,
                               cycle_time: int = 90) -> SignalTiming:
        """
        Oddiy proporsional optimallashtirish
        
        Q-Learning o'rniga oddiy hisoblash
        """
        ns_queue = state.north_queue + state.south_queue
        ew_queue = state.east_queue + state.west_queue
        total = ns_queue + ew_queue
        
        if total == 0:
            # Teng taqsimlash
            ns_green = (cycle_time - 10) // 2
            ew_green = (cycle_time - 10) // 2
        else:
            # Navbatga proporsional
            available = cycle_time - 10  # yellow + all_red vaqtlari
            ns_green = max(self.MIN_GREEN, int(available * ns_queue / total))
            ew_green = max(self.MIN_GREEN, available - ns_green)
        
        return SignalTiming(
            ns_green=ns_green,
            ew_green=ew_green
        )
    
    def get_statistics(self) -> dict:
        """Statistikani olish"""
        return {
            **self.stats,
            "q_table_size": len(self.q_table),
            "intersections": len(self.current_timings)
        }


class AdaptiveSignalController:
    """
    Moslashuvchi Svetofor Boshqaruvchisi
    
    Real vaqtda svetofor fazalarini boshqaradi
    """
    
    def __init__(self, intersection_id: str):
        """
        Controller yaratish
        
        Args:
            intersection_id: Chorraha ID
        """
        self.intersection_id = intersection_id
        self.current_phase = SignalPhase.NORTH_SOUTH_GREEN
        self.phase_start_time = datetime.now()
        self.timing = SignalTiming()
        self.optimizer = SignalOptimizer()
        
        # Emergency mode
        self.emergency_mode = False
        self.emergency_direction = None
    
    def get_current_phase(self) -> SignalPhase:
        """Hozirgi fazani olish"""
        if self.emergency_mode:
            return SignalPhase.EMERGENCY
        return self.current_phase
    
    def get_phase_remaining_time(self) -> int:
        """Qolgan vaqt (sekund)"""
        elapsed = (datetime.now() - self.phase_start_time).total_seconds()
        
        if self.current_phase == SignalPhase.NORTH_SOUTH_GREEN:
            remaining = self.timing.ns_green - elapsed
        elif self.current_phase == SignalPhase.EAST_WEST_GREEN:
            remaining = self.timing.ew_green - elapsed
        else:
            remaining = self.timing.all_red - elapsed
        
        return max(0, int(remaining))
    
    def update(self, state: IntersectionState) -> Tuple[SignalPhase, int]:
        """
        Svetofor holatini yangilash
        
        Args:
            state: Chorraha holati
        
        Returns:
            (joriy faza, qolgan vaqt)
        """
        remaining = self.get_phase_remaining_time()
        
        if remaining <= 0:
            # Keyingi fazaga o'tish
            self._switch_phase()
            
            # Yangi siklda optimallashtirish
            if self.current_phase == SignalPhase.NORTH_SOUTH_GREEN:
                self.timing = self.optimizer.optimize(state)
        
        return self.get_current_phase(), self.get_phase_remaining_time()
    
    def _switch_phase(self):
        """Keyingi fazaga o'tish"""
        self.phase_start_time = datetime.now()
        
        if self.current_phase == SignalPhase.NORTH_SOUTH_GREEN:
            self.current_phase = SignalPhase.ALL_RED
        elif self.current_phase == SignalPhase.ALL_RED:
            if self._was_ns_phase():
                self.current_phase = SignalPhase.EAST_WEST_GREEN
            else:
                self.current_phase = SignalPhase.NORTH_SOUTH_GREEN
        elif self.current_phase == SignalPhase.EAST_WEST_GREEN:
            self.current_phase = SignalPhase.ALL_RED
        
        self._last_main_phase = self.current_phase
    
    def _was_ns_phase(self) -> bool:
        """Oldingi asosiy faza NS edi-mi"""
        return getattr(self, '_last_main_phase', SignalPhase.EAST_WEST_GREEN) == SignalPhase.ALL_RED
    
    def activate_emergency(self, direction: str):
        """
        Favqulodda rejimni yoqish
        
        Args:
            direction: Yo'nalish ("north", "south", "east", "west")
        """
        self.emergency_mode = True
        self.emergency_direction = direction
        self.current_phase = SignalPhase.EMERGENCY
        self.phase_start_time = datetime.now()
        print(f"🚨 Emergency mode: {self.intersection_id} - {direction}")
    
    def deactivate_emergency(self):
        """Favqulodda rejimni o'chirish"""
        self.emergency_mode = False
        self.emergency_direction = None
        self.current_phase = SignalPhase.ALL_RED
        self.phase_start_time = datetime.now()
        print(f"✅ Emergency mode off: {self.intersection_id}")


# Test uchun
if __name__ == "__main__":
    # Test
    optimizer = SignalOptimizer()
    
    # Test holat
    state = IntersectionState(
        intersection_id="INT-001",
        north_queue=10,
        south_queue=8,
        east_queue=3,
        west_queue=4
    )
    
    print("🚦 Svetofor Optimallashtirish Testi\n")
    print(f"Chorraha: {state.intersection_id}")
    print(f"Navbatlar: N={state.north_queue}, S={state.south_queue}, E={state.east_queue}, W={state.west_queue}")
    
    # Q-Learning
    timing_ql = optimizer.optimize(state)
    print(f"\n📊 Q-Learning:")
    print(f"   NS Green: {timing_ql.ns_green}s")
    print(f"   EW Green: {timing_ql.ew_green}s")
    
    # Proporsional
    timing_prop = optimizer.optimize_proportional(state)
    print(f"\n📊 Proportional:")
    print(f"   NS Green: {timing_prop.ns_green}s")
    print(f"   EW Green: {timing_prop.ew_green}s")
    
    print(f"\n📈 Stats: {optimizer.get_statistics()}")
