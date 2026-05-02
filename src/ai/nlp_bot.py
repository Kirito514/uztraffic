"""
NLP Chatbot Moduli (OQIM AI Assistant)

Haydovchilar bilan o'zbek tilida muloqot qilish, tirbandlik holatini aytish 
va avariyalarni avtomatik qayd etish uchun soddalashtirilgan NLP mantiq.
"""

import re
from typing import Dict, Any

class NLPBot:
    def __init__(self, traffic_analyzer=None, evp_controller=None):
        self.traffic_analyzer = traffic_analyzer
        self.evp_controller = evp_controller
        
        # Intent (maqsad) ni aniqlash uchun kalit so'zlar
        self.intents = {
            "traffic_info": [r"tirband", r"qanaqa", r"holat", r"qanday", r"ko'cha"],
            "accident_report": [r"avariya", r"yopiq", r"to'sib", r"urilib", r"tezyordam"],
            "route_recommend": [r"tez", r"qisqa", r"tavsiya", r"qaysi", r"marshrut"]
        }
    
    def process_message(self, message: str, user_id: str = "driver_1") -> Dict[str, Any]:
        """Xabarni tahlil qilish va mos javob qaytarish"""
        msg_lower = message.lower()
        
        # Intent ni aniqlash
        detected_intent = "unknown"
        for intent, patterns in self.intents.items():
            if any(re.search(p, msg_lower) for p in patterns):
                detected_intent = intent
                break
                
        # Javobni shakllantirish
        if detected_intent == "traffic_info":
            return self._handle_traffic_info(msg_lower)
        elif detected_intent == "accident_report":
            return self._handle_accident(msg_lower, user_id)
        elif detected_intent == "route_recommend":
            return self._handle_recommend()
        else:
            return {
                "response": "Kechirasiz, men sizni to'liq tushunmadim. 'Tirbandlik', 'Avariya' yoki 'Eng tez yo'l' haqida so'rashingiz mumkin.",
                "action": "none"
            }
            
    def _handle_traffic_info(self, msg: str) -> Dict[str, Any]:
        # Agar analyzer ulanmagan bo'lsa
        if not self.traffic_analyzer:
            return {"response": "Trafik tizimiga ulanish yo'q.", "action": "none"}
            
        overview = self.traffic_analyzer.get_city_overview()
        avg_speed = overview.get("average_speed", 0)
        congestion = overview.get("average_congestion", 0)
        
        response = f"Hozir shaharda o'rtacha tezlik {avg_speed} km/soat, tirbandlik darajasi {congestion}%."
        if congestion > 60:
            response += " Ba'zi yo'llarda jiddiy tirbandlik kuzatilmoqda, ehtiyot bo'ling."
        elif congestion < 30:
            response += " Yo'llar asosan bo'sh, oqim erkin."
            
        return {"response": response, "action": "show_traffic"}

    def _handle_accident(self, msg: str, user_id: str) -> Dict[str, Any]:
        # Avariyani qayd etish simulyatsiyasi
        response = "Avariya haqida ma'lumot qabul qilindi. Markaziy tizimga yuborildi va tez yordamga xabar berildi. Iltimos, xavfsiz masofani saqlang."
        return {
            "response": response,
            "action": "trigger_emergency",
            "data": {"vehicle_id": user_id}
        }
        
    def _handle_recommend(self) -> Dict[str, Any]:
        response = "Hozirgi trafikka asosan, sizga muqobil marshrutni (yashil chiziq) tavsiya qilaman. Bu sizning vaqtingizni taxminan 15 daqiqaga tejaydi."
        return {
            "response": response,
            "action": "show_recommendation"
        }
