"""
Tavsiya Tizimi (Recommendation)

Tirbandlik holati asosida muqobil marshrutlarni tavsiya qilish mantiqi.
"""

from typing import Dict, Any

class RouteRecommender:
    def __init__(self, traffic_analyzer):
        self.traffic_analyzer = traffic_analyzer
        
    def recommend_route(self, start_lat: float, start_lng: float, end_lat: float, end_lng: float) -> Dict[str, Any]:
        """Eng tezkor marshrutni hisoblash (simulyatsiya)"""
        
        if not self.traffic_analyzer:
             return {"status": "error", "message": "Analyzer not found"}
             
        # Haqiqiy loyihada A* yoki Dijkstra algoritmi ishlatiladi.
        # Bu yerda MVP uchun simulyatsiya qaytarilmoqda.
        overview = self.traffic_analyzer.get_city_overview()
        
        is_congested = overview.get("average_congestion", 0) > 50
        
        if is_congested:
            message = "Asosiy yo'lda tirbandlik yuqori. Aylanma yo'l tavsiya etiladi."
            time_saved = 12
        else:
            message = "Asosiy yo'l ochiq. To'g'ri marshrut optimal."
            time_saved = 0
            
        return {
            "status": "ok",
            "message": message,
            "time_saved_minutes": time_saved,
            "recommended_path": [
                {"lat": start_lat, "lng": start_lng},
                # Oradagi o'zgarish (aylanma yo'l kabi)
                {"lat": (start_lat + end_lat)/2 + 0.005, "lng": (start_lng + end_lng)/2 - 0.005},
                {"lat": end_lat, "lng": end_lng}
            ]
        }
