"""
Tirbandlik Bashorati

LSTM va boshqa algoritmlari yordamida trafik tirbandligini bashorat qilish
"""

import numpy as np
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from collections import defaultdict

try:
    from sklearn.preprocessing import MinMaxScaler
    from sklearn.ensemble import RandomForestRegressor
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    print("⚠️ scikit-learn o'rnatilmagan. Oddiy bashorat ishlatiladi.")


@dataclass
class PredictionResult:
    """Bashorat natijasi"""
    segment_id: str
    current_congestion: float
    predictions: List[Tuple[datetime, float]]  # [(vaqt, bashorat), ...]
    confidence: float
    trend: str  # "increasing", "decreasing", "stable"
    
    def to_dict(self) -> dict:
        return {
            "segment_id": self.segment_id,
            "current_congestion": round(self.current_congestion, 1),
            "predictions": [
                {"time": t.isoformat(), "value": round(v, 1)}
                for t, v in self.predictions
            ],
            "confidence": round(self.confidence, 2),
            "trend": self.trend
        }


class CongestionPredictor:
    """
    Tirbandlik Bashorati
    
    Tarixiy ma'lumotlar va vaqt pattern'lari asosida
    kelajakdagi tirbandlikni bashorat qiladi.
    """
    
    def __init__(self, history_hours: int = 24):
        """
        CongestionPredictor yaratish
        
        Args:
            history_hours: Tarix oynasi (soat)
        """
        self.history_hours = history_hours
        self.history: Dict[str, List[Tuple[datetime, float]]] = defaultdict(list)
        
        # Model (agar sklearn mavjud bo'lsa)
        self.models: Dict[str, RandomForestRegressor] = {}
        self.scalers: Dict[str, MinMaxScaler] = {}
        
        # Vaqtga bog'liq pattern'lar (O'zbekiston uchun)
        self.hourly_patterns = self._initialize_patterns()
    
    def _initialize_patterns(self) -> Dict[int, float]:
        """
        Soatlik trafik pattern'lari
        
        O'zbekistonda tipik trafik holati
        """
        return {
            0: 0.1, 1: 0.05, 2: 0.05, 3: 0.05, 4: 0.1, 5: 0.2,
            6: 0.4, 7: 0.7, 8: 0.9, 9: 0.8, 10: 0.6, 11: 0.5,
            12: 0.6, 13: 0.7, 14: 0.6, 15: 0.5, 16: 0.6, 17: 0.8,
            18: 0.95, 19: 0.9, 20: 0.7, 21: 0.5, 22: 0.3, 23: 0.2
        }
    
    def add_observation(self, segment_id: str, congestion: float, 
                        timestamp: datetime = None):
        """
        Kuzatuv qo'shish
        
        Args:
            segment_id: Segment ID
            congestion: Tirbandlik darajasi (0-100)
            timestamp: Vaqt tamg'asi
        """
        if timestamp is None:
            timestamp = datetime.now()
        
        self.history[segment_id].append((timestamp, congestion))
        self._cleanup_history(segment_id)
    
    def _cleanup_history(self, segment_id: str):
        """Eski yozuvlarni tozalash"""
        cutoff = datetime.now() - timedelta(hours=self.history_hours)
        self.history[segment_id] = [
            (t, c) for t, c in self.history[segment_id] if t > cutoff
        ]
    
    def predict(self, segment_id: str, 
                horizon_minutes: List[int] = [15, 30, 60]) -> PredictionResult:
        """
        Tirbandlikni bashorat qilish
        
        Args:
            segment_id: Segment ID
            horizon_minutes: Bashorat vaqtlari (daqiqa)
        
        Returns:
            Bashorat natijasi
        """
        history = self.history.get(segment_id, [])
        
        if not history:
            return self._default_prediction(segment_id, horizon_minutes)
        
        current_congestion = history[-1][1]
        now = datetime.now()
        
        predictions = []
        for minutes in horizon_minutes:
            future_time = now + timedelta(minutes=minutes)
            predicted_value = self._predict_single(segment_id, future_time, history)
            predictions.append((future_time, predicted_value))
        
        # Trend aniqlash
        trend = self._analyze_trend(history)
        
        # Ishonch darajasi
        confidence = self._calculate_confidence(history)
        
        return PredictionResult(
            segment_id=segment_id,
            current_congestion=current_congestion,
            predictions=predictions,
            confidence=confidence,
            trend=trend
        )
    
    def _predict_single(self, segment_id: str, future_time: datetime,
                        history: List[Tuple[datetime, float]]) -> float:
        """
        Bitta vaqt nuqtasi uchun bashorat
        
        Hybrid approach:
        1. Vaqt pattern'lari
        2. So'nggi trend
        3. ML model (agar mavjud bo'lsa)
        """
        # So'nggi qiymat
        last_value = history[-1][1]
        
        # Vaqt pattern multiplier
        hour = future_time.hour
        pattern_factor = self.hourly_patterns.get(hour, 0.5)
        
        # Trend hisoblash
        if len(history) >= 5:
            recent_values = [c for _, c in history[-5:]]
            trend_delta = (recent_values[-1] - recent_values[0]) / 5
        else:
            trend_delta = 0
        
        # Vaqt farqi
        time_diff_minutes = (future_time - datetime.now()).total_seconds() / 60
        
        # Bashorat formulasi
        # Base: pattern-based expected value
        base_prediction = pattern_factor * 100
        
        # Current deviation from pattern
        current_hour = datetime.now().hour
        current_pattern = self.hourly_patterns.get(current_hour, 0.5)
        deviation = last_value - (current_pattern * 100)
        
        # Adjusted prediction
        predicted = base_prediction + deviation * (1 - time_diff_minutes / 120)
        
        # Trend adjustment
        predicted += trend_delta * (time_diff_minutes / 5)
        
        # ML model adjustment (agar mavjud)
        if SKLEARN_AVAILABLE and segment_id in self.models:
            ml_prediction = self._ml_predict(segment_id, future_time, history)
            predicted = 0.7 * predicted + 0.3 * ml_prediction
        
        return max(0, min(100, predicted))
    
    def _ml_predict(self, segment_id: str, future_time: datetime,
                    history: List[Tuple[datetime, float]]) -> float:
        """Machine Learning asosida bashorat"""
        if segment_id not in self.models:
            return history[-1][1]
        
        # Features
        features = self._extract_features(future_time, history)
        
        # Predict
        model = self.models[segment_id]
        scaler = self.scalers[segment_id]
        
        X = np.array([features])
        X_scaled = scaler.transform(X)
        prediction = model.predict(X_scaled)[0]
        
        return max(0, min(100, prediction))
    
    def _extract_features(self, target_time: datetime,
                          history: List[Tuple[datetime, float]]) -> List[float]:
        """Feature extraction"""
        features = [
            target_time.hour,
            target_time.weekday(),
            target_time.minute / 60,
        ]
        
        # So'nggi qiymatlar
        if len(history) >= 5:
            recent = [c for _, c in history[-5:]]
            features.extend([
                np.mean(recent),
                np.std(recent),
                recent[-1],
                recent[-1] - recent[0]
            ])
        else:
            features.extend([50, 10, 50, 0])
        
        return features
    
    def train_model(self, segment_id: str):
        """
        ML modelni o'qitish
        
        Args:
            segment_id: Segment ID
        """
        if not SKLEARN_AVAILABLE:
            return
        
        history = self.history.get(segment_id, [])
        if len(history) < 100:
            print(f"⚠️ {segment_id}: Kam ma'lumot ({len(history)} < 100)")
            return
        
        # Ma'lumotlarni tayyorlash
        X, y = [], []
        for i in range(10, len(history)):
            target_time = history[i][0]
            target_value = history[i][1]
            past_history = history[:i]
            
            features = self._extract_features(target_time, past_history)
            X.append(features)
            y.append(target_value)
        
        X = np.array(X)
        y = np.array(y)
        
        # Normalize
        scaler = MinMaxScaler()
        X_scaled = scaler.fit_transform(X)
        
        # Train
        model = RandomForestRegressor(n_estimators=50, max_depth=10, random_state=42)
        model.fit(X_scaled, y)
        
        self.models[segment_id] = model
        self.scalers[segment_id] = scaler
        
        print(f"✅ Model o'qitildi: {segment_id}")
    
    def _analyze_trend(self, history: List[Tuple[datetime, float]]) -> str:
        """Trend tahlili"""
        if len(history) < 3:
            return "stable"
        
        recent = [c for _, c in history[-10:]]
        first_half = np.mean(recent[:len(recent)//2])
        second_half = np.mean(recent[len(recent)//2:])
        
        diff = second_half - first_half
        
        if diff > 10:
            return "increasing"
        elif diff < -10:
            return "decreasing"
        else:
            return "stable"
    
    def _calculate_confidence(self, history: List[Tuple[datetime, float]]) -> float:
        """Ishonch darajasini hisoblash"""
        if len(history) < 5:
            return 0.3
        if len(history) < 20:
            return 0.5
        if len(history) < 100:
            return 0.7
        return 0.85
    
    def _default_prediction(self, segment_id: str,
                            horizon_minutes: List[int]) -> PredictionResult:
        """Ma'lumot yo'q bo'lganda default bashorat"""
        now = datetime.now()
        predictions = []
        
        for minutes in horizon_minutes:
            future_time = now + timedelta(minutes=minutes)
            hour = future_time.hour
            pattern_value = self.hourly_patterns.get(hour, 0.5) * 100
            predictions.append((future_time, pattern_value))
        
        return PredictionResult(
            segment_id=segment_id,
            current_congestion=0,
            predictions=predictions,
            confidence=0.2,
            trend="stable"
        )
    
    def predict_all(self, segment_ids: List[str]) -> Dict[str, PredictionResult]:
        """Barcha segmentlar uchun bashorat"""
        return {sid: self.predict(sid) for sid in segment_ids}


# Test uchun
if __name__ == "__main__":
    predictor = CongestionPredictor()
    
    # Simulyatsiya ma'lumotlari
    import random
    segment_id = "SEG-02-02"
    
    # 2 soatlik tarix
    base_time = datetime.now() - timedelta(hours=2)
    for i in range(120):
        time = base_time + timedelta(minutes=i)
        hour = time.hour
        pattern = predictor.hourly_patterns.get(hour, 0.5)
        congestion = pattern * 100 + random.uniform(-10, 10)
        predictor.add_observation(segment_id, congestion, time)
    
    # Bashorat
    result = predictor.predict(segment_id)
    
    print("\n📈 Tirbandlik Bashorati:")
    print(f"   Segment: {result.segment_id}")
    print(f"   Hozirgi: {result.current_congestion:.1f}%")
    print(f"   Trend: {result.trend}")
    print(f"   Ishonch: {result.confidence:.0%}")
    print("\n   Bashoratlar:")
    for time, value in result.predictions:
        print(f"      {time.strftime('%H:%M')}: {value:.1f}%")
