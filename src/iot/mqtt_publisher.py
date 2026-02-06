"""
MQTT Publisher

GPS ma'lumotlarini MQTT broker orqali serverga yuborish
"""

import json
import asyncio
from typing import Optional, Callable
from datetime import datetime

try:
    import paho.mqtt.client as mqtt
except ImportError:
    mqtt = None
    print("⚠️ paho-mqtt o'rnatilmagan. MQTT funksiyalari ishlamaydi.")

from .gps_device import GPSDevice, GPSData


class MQTTPublisher:
    """
    MQTT orqali GPS ma'lumotlarini yuborish
    
    Har bir GPS qurilma o'z ma'lumotlarini MQTT broker orqali
    markaziy serverga yuboradi.
    """
    
    def __init__(self, 
                 broker: str = "localhost",
                 port: int = 1883,
                 topic_prefix: str = "traffic"):
        """
        MQTT Publisher yaratish
        
        Args:
            broker: MQTT broker manzili
            port: MQTT port
            topic_prefix: Topic prefiksi
        """
        self.broker = broker
        self.port = port
        self.topic_prefix = topic_prefix
        self.client: Optional[mqtt.Client] = None
        self.is_connected = False
        
    def connect(self) -> bool:
        """MQTT brokerga ulanish"""
        if mqtt is None:
            print("❌ MQTT kutubxonasi topilmadi")
            return False
            
        try:
            self.client = mqtt.Client()
            self.client.on_connect = self._on_connect
            self.client.on_disconnect = self._on_disconnect
            
            self.client.connect(self.broker, self.port, 60)
            self.client.loop_start()
            return True
        except Exception as e:
            print(f"❌ MQTT ulanish xatosi: {e}")
            return False
    
    def _on_connect(self, client, userdata, flags, rc):
        """Ulanish callback"""
        if rc == 0:
            print(f"✅ MQTT brokerga ulandi: {self.broker}:{self.port}")
            self.is_connected = True
        else:
            print(f"❌ MQTT ulanish xatosi, kod: {rc}")
    
    def _on_disconnect(self, client, userdata, rc):
        """Uzilish callback"""
        print("⚠️ MQTT aloqa uzildi")
        self.is_connected = False
    
    def publish_gps_data(self, gps_data: GPSData) -> bool:
        """
        GPS ma'lumotlarini yuborish
        
        Args:
            gps_data: GPS ma'lumotlari
        
        Returns:
            Muvaffaqiyatli yuborilganmi
        """
        if not self.is_connected or self.client is None:
            return False
        
        topic = f"{self.topic_prefix}/vehicles/{gps_data.vehicle_id}"
        payload = json.dumps(gps_data.to_dict())
        
        try:
            result = self.client.publish(topic, payload, qos=1)
            return result.rc == mqtt.MQTT_ERR_SUCCESS
        except Exception as e:
            print(f"❌ Ma'lumot yuborishda xato: {e}")
            return False
    
    def publish_emergency_alert(self, gps_data: GPSData, destination: dict) -> bool:
        """
        Maxsus transport signali yuborish
        
        Args:
            gps_data: GPS ma'lumotlari
            destination: Maqsad koordinatalari {lat, lng}
        """
        if not self.is_connected or self.client is None:
            return False
        
        topic = f"{self.topic_prefix}/emergency/{gps_data.vehicle_id}"
        payload = json.dumps({
            "vehicle": gps_data.to_dict(),
            "destination": destination,
            "priority": 1 if gps_data.vehicle_type in ["ambulance", "fire_truck"] else 2,
            "timestamp": datetime.now().isoformat()
        })
        
        try:
            result = self.client.publish(topic, payload, qos=2)  # QoS 2 - muhim xabar
            return result.rc == mqtt.MQTT_ERR_SUCCESS
        except Exception as e:
            print(f"❌ Favqulodda signal yuborishda xato: {e}")
            return False
    
    def disconnect(self):
        """MQTT ulanishni yopish"""
        if self.client:
            self.client.loop_stop()
            self.client.disconnect()
            print("✅ MQTT ulanish yopildi")


class SimulatedPublisher:
    """
    MQTT o'rniga oddiy simulyatsiya uchun publisher
    
    MQTT broker yo'q bo'lganda ma'lumotlarni to'g'ridan-to'g'ri
    callback funksiyaga yuboradi.
    """
    
    def __init__(self, callback: Optional[Callable[[GPSData], None]] = None):
        """
        Simulyatsiya publisher
        
        Args:
            callback: Ma'lumotlarni qabul qiluvchi funksiya
        """
        self.callback = callback
        self.data_buffer: list[GPSData] = []
        self.is_connected = True
    
    def connect(self) -> bool:
        """Ulanish simulyatsiyasi"""
        print("✅ Simulyatsiya rejimida ishlamoqda")
        return True
    
    def publish_gps_data(self, gps_data: GPSData) -> bool:
        """Ma'lumotlarni buffer yoki callbackga yuborish"""
        self.data_buffer.append(gps_data)
        
        if self.callback:
            self.callback(gps_data)
        
        return True
    
    def publish_emergency_alert(self, gps_data: GPSData, destination: dict) -> bool:
        """Maxsus transport signali"""
        print(f"🚨 FAVQULODDA: {gps_data.vehicle_type.value} - {gps_data.vehicle_id}")
        return self.publish_gps_data(gps_data)
    
    def get_buffer(self) -> list[GPSData]:
        """Buferdagi ma'lumotlarni olish"""
        return self.data_buffer.copy()
    
    def clear_buffer(self):
        """Buferni tozalash"""
        self.data_buffer.clear()
    
    def disconnect(self):
        """Ulanishni yopish"""
        pass


def create_publisher(use_mqtt: bool = False, **kwargs):
    """
    Publisher yaratish
    
    Args:
        use_mqtt: MQTT ishlatish yoki simulyatsiya
        **kwargs: Publisher parametrlari
    """
    if use_mqtt and mqtt is not None:
        return MQTTPublisher(**kwargs)
    return SimulatedPublisher(**kwargs)
