"""
OQIM — DQN svetofor agentini o'qitish (Oqim_DQN_Colab.ipynb v2.0 bilan bir xil)

Muhit:   holat [ns/50, ew/50, (qadam % 10)/10]
         4 harakat: NS15, EW15, NS30, EW30 (mos ravishda 8/8/15/15 mashina o'tadi)
         kelish: NS ~ Poisson(8), EW ~ Poisson(6) har qadamda
         mukofot: 10 − 0.5·jami − 0.3·|ns − ew|
Tarmoq:  3 → 128 → 128 → 64 → 4 (ReLU), Huber loss, target tarmoq, replay xotira

Faqat o'qitish uchun torch kerak (server uni import qilmaydi):
    pip install torch --index-url https://download.pytorch.org/whl/cpu
    python scripts/train_dqn.py

Natija: data/dqn_weights.npz (W1..W4, b1..b4 + o'qitish ko'rsatkichlari),
        runtime'da src/ai/dqn_policy.py uni sof NumPy'da ishlatadi.
"""

import copy
import random
import sys
from collections import deque
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim

ROOT = Path(__file__).resolve().parents[1]
WEIGHTS_PATH = ROOT / "data" / "dqn_weights.npz"

# === SOZLAMALAR (notebook v2.0) ===
EPISODES = 500
BATCH_SIZE = 64
GAMMA = 0.99
EPSILON_START = 1.0
EPSILON_END = 0.01
EPSILON_DECAY = 0.99
LEARNING_RATE = 0.0005
MEMORY_SIZE = 10000
TARGET_UPDATE = 10
SEED = 42

PASS = {0: (8, 0), 1: (0, 8), 2: (15, 0), 3: (0, 15)}


class Intersection:
    """4 tomonlama chorraha (notebook bilan bir xil)."""

    def __init__(self, rng: np.random.Generator, max_steps: int = 200):
        self.rng = rng
        self.max_steps = max_steps
        self.ns_queue = 0
        self.ew_queue = 0
        self.step_count = 0

    def get_state(self) -> np.ndarray:
        return np.array([self.ns_queue / 50.0, self.ew_queue / 50.0,
                         (self.step_count % 10) / 10.0], dtype=np.float32)

    def step(self, action: int):
        self.ns_queue += int(self.rng.poisson(8))
        self.ew_queue += int(self.rng.poisson(6))
        ns_pass, ew_pass = PASS[action]
        self.ns_queue = max(0, self.ns_queue - ns_pass)
        self.ew_queue = max(0, self.ew_queue - ew_pass)
        self.step_count += 1
        total = self.ns_queue + self.ew_queue
        imbalance = abs(self.ns_queue - self.ew_queue)
        reward = 10.0 - total * 0.5 - imbalance * 0.3
        return self.get_state(), reward, self.step_count >= self.max_steps

    def reset(self) -> np.ndarray:
        self.ns_queue = int(self.rng.integers(0, 26))
        self.ew_queue = int(self.rng.integers(0, 26))
        self.step_count = 0
        return self.get_state()


class DQN(nn.Module):
    def __init__(self, state_size: int = 3, action_size: int = 4):
        super().__init__()
        self.network = nn.Sequential(
            nn.Linear(state_size, 128), nn.ReLU(),
            nn.Linear(128, 128), nn.ReLU(),
            nn.Linear(128, 64), nn.ReLU(),
            nn.Linear(64, action_size),
        )

    def forward(self, x):
        return self.network(x)


def evaluate(policy, episodes: int = 50, seed: int = 1000) -> float:
    """O'rtacha epizod mukofoti; har bir siyosat bir xil tasodifiy oqimda sinanadi."""
    totals = []
    for ep in range(episodes):
        env = Intersection(np.random.default_rng(seed + ep))
        state = env.reset()
        total, done = 0.0, False
        while not done:
            state, reward, done = env.step(policy(state, env.step_count))
            total += reward
        totals.append(total)
    return float(np.mean(totals))


def train():
    random.seed(SEED)
    np.random.seed(SEED)
    torch.manual_seed(SEED)

    model = DQN()
    target_model = copy.deepcopy(model)
    optimizer = optim.Adam(model.parameters(), lr=LEARNING_RATE)
    memory = deque(maxlen=MEMORY_SIZE)
    env = Intersection(np.random.default_rng(SEED))
    epsilon = EPSILON_START
    reward_history, loss_history = [], []

    for episode in range(EPISODES):
        state = env.reset()
        total_reward, ep_losses = 0.0, []
        while True:
            if random.random() < epsilon:
                action = random.randint(0, 3)
            else:
                with torch.no_grad():
                    action = int(model(torch.from_numpy(state)).argmax().item())
            next_state, reward, done = env.step(action)
            memory.append((state, action, reward, next_state, done))
            total_reward += reward
            state = next_state

            if len(memory) >= BATCH_SIZE:
                batch = random.sample(memory, BATCH_SIZE)
                states = torch.from_numpy(np.array([b[0] for b in batch]))
                actions = torch.tensor([b[1] for b in batch], dtype=torch.long)
                rewards = torch.tensor([b[2] for b in batch], dtype=torch.float32)
                next_states = torch.from_numpy(np.array([b[3] for b in batch]))
                dones = torch.tensor([b[4] for b in batch], dtype=torch.float32)

                current_q = model(states).gather(1, actions.unsqueeze(1)).squeeze(1)
                with torch.no_grad():
                    next_q = target_model(next_states).max(1)[0]
                target_q = rewards + GAMMA * next_q * (1 - dones)
                loss = nn.SmoothL1Loss()(current_q, target_q)
                optimizer.zero_grad()
                loss.backward()
                torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
                optimizer.step()
                ep_losses.append(loss.item())
            if done:
                break

        if (episode + 1) % TARGET_UPDATE == 0:
            target_model.load_state_dict(model.state_dict())
        epsilon = max(EPSILON_END, epsilon * EPSILON_DECAY)
        reward_history.append(total_reward)
        if ep_losses:
            loss_history.append(float(np.mean(ep_losses)))
        if (episode + 1) % 50 == 0:
            print(f"Epizod {episode + 1}/{EPISODES} | o'rtacha baho (50): "
                  f"{np.mean(reward_history[-50:]):.1f} | epsilon: {epsilon:.4f}")

    return model, reward_history, loss_history, epsilon


def main():
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="replace")

    model, rewards, losses, epsilon = train()
    model.eval()

    def dqn_policy(state, _step):
        with torch.no_grad():
            return int(model(torch.from_numpy(state)).argmax().item())

    # Fiks taymer: har yo'nalishga 30 s (uzun yashil), navbatma-navbat
    def fixed_policy(_state, step):
        return 2 if step % 2 == 0 else 3

    eval_dqn = evaluate(dqn_policy)
    eval_fixed = evaluate(fixed_policy)

    layers = [m for m in model.network if isinstance(m, nn.Linear)]
    arrays = {}
    for i, layer in enumerate(layers, start=1):
        arrays[f"W{i}"] = layer.weight.detach().numpy().T.astype(np.float32)   # (in, out)
        arrays[f"b{i}"] = layer.bias.detach().numpy().astype(np.float32)
    WEIGHTS_PATH.parent.mkdir(parents=True, exist_ok=True)
    np.savez(
        WEIGHTS_PATH,
        **arrays,
        episodes=EPISODES,
        final_epsilon=epsilon,
        reward_first20=float(np.mean(rewards[:20])),
        reward_last20=float(np.mean(rewards[-20:])),
        loss_last20=float(np.mean(losses[-20:])),
        eval_reward_dqn=eval_dqn,
        eval_reward_fixed30=eval_fixed,
    )

    print(f"\nBoshlang'ich baho (20 epizod): {np.mean(rewards[:20]):.1f}")
    print(f"Yakuniy baho (20 epizod):      {np.mean(rewards[-20:]):.1f}")
    print(f"Yakuniy epsilon:               {epsilon:.4f}")
    print(f"Baholash (50 epizod, bir xil oqim): DQN {eval_dqn:.1f}  |  fiks 30/30 {eval_fixed:.1f}")
    print(f"✅ Saqlandi: {WEIGHTS_PATH}")


if __name__ == "__main__":
    main()
