"""
DQN svetofor siyosati — sof NumPy inference

scripts/train_dqn.py o'qitgan og'irliklarni (data/dqn_weights.npz) yuklaydi.
Server torch'ni import qilmaydi: 3 → 128 → 128 → 64 → 4 tarmoq NumPy'da hisoblanadi.

Holat:   [ns_queue / 50, ew_queue / 50, (qaror_raqami % 10) / 10]
Harakat: 0 = NS 15 s, 1 = EW 15 s, 2 = NS 30 s, 3 = EW 30 s
"""

from pathlib import Path
from typing import Tuple

import numpy as np

WEIGHTS_PATH = Path(__file__).resolve().parents[2] / "data" / "dqn_weights.npz"

# harakat → (yashil o'q, yashil davomiyligi s)
ACTIONS: Tuple[Tuple[str, int], ...] = (("NS", 15), ("EW", 15), ("NS", 30), ("EW", 30))
QUEUE_SCALE = 50.0


def make_state(ns_queue: float, ew_queue: float, decision: int) -> np.ndarray:
    return np.array([ns_queue / QUEUE_SCALE, ew_queue / QUEUE_SCALE, (decision % 10) / 10.0],
                    dtype=np.float32)


class DQNPolicy:
    def __init__(self, path: Path = WEIGHTS_PATH):
        if not path.exists():
            raise FileNotFoundError(
                f"DQN og'irliklari topilmadi: {path}. Avval: python scripts/train_dqn.py")
        data = np.load(path)
        self.layers = [(data[f"W{i}"], data[f"b{i}"]) for i in range(1, 5)]
        weight_keys = {f"{p}{i}" for p in "Wb" for i in range(1, 5)}
        self.info = {k: float(data[k]) for k in data.files if k not in weight_keys}

    def q_values(self, states: np.ndarray) -> np.ndarray:
        """states: (n, 3) yoki (3,) → Q-qiymatlar (n, 4) yoki (4,)."""
        x = np.asarray(states, dtype=np.float32)
        single = x.ndim == 1
        if single:
            x = x[None, :]
        for i, (w, b) in enumerate(self.layers):
            x = x @ w + b
            if i < len(self.layers) - 1:
                x = np.maximum(x, 0.0)
        return x[0] if single else x

    def act(self, state: np.ndarray) -> int:
        return int(np.argmax(self.q_values(state)))
