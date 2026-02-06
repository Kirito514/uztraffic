"""
Qurilmalar Boshqaruvchisi

Barcha GPS qurilmalarni markazlashgan holda boshqarish
"""

import asyncio
import random
from typing import Dict, List, Optional, Callable
from datetime import datetime

from .gps_device import GPSDevice, GPSData, GPSDeviceFactory, VehicleType
from .mqtt_publisher import MQTTPublisher, SimulatedPublisher, create_publisher


class DeviceManager:
    """
    GPS Qurilmalar Boshqaruvchisi
    
    Barcha virtual GPS qurilmalarni yaratish, boshqarish va
    ma'lumotlarni markaziy serverga yuborishni muvofiqlashtiradi.
    """
    
    def __init__(self, 
                 use_mqtt: bool = False,
                 mqtt_broker: str = "localhost",
                 mqtt_port: int = 1883):
        """
        DeviceManager yaratish
        
        Args:
            use_mqtt: MQTT ishlatish
            mqtt_broker: MQTT broker manzili
            mqtt_port: MQTT port
        """
        self.devices: Dict[str, GPSDevice] = {}
        self.emergency_devices: Dict[str, GPSDevice] = {}
        
        # Publisher yaratish
        if use_mqtt:
            self.publisher = create_publisher(
                use_mqtt=True,
                broker=mqtt_broker,
                port=mqtt_port
            )
        else:
            self.publisher = create_publisher(use_mqtt=False)
        
        self.is_running = False
        self.update_interval = 1.0  # sekund
        
        # Callback funksiyalar
        self.on_data_received: Optional[Callable[[GPSData], None]] = None
        self.on_emergency_alert: Optional[Callable[[GPSData, dict], None]] = None
        
        # Statistika
        self.stats = {
            "total_updates": 0,
            "emergency_alerts": 0,
            "start_time": None
        }
    
    def add_device(self, device: GPSDevice) -> str:
        """
        Yangi qurilma qo'shish
        
        Args:
            device: GPS qurilma
        
        Returns:
            Qurilma ID
        """
        if device.is_emergency:
            self.emergency_devices[device.vehicle_id] = device
        else:
            self.devices[device.vehicle_id] = device
        
        return device.vehicle_id
    
    def remove_device(self, vehicle_id: str) -> bool:
        """Qurilmani olib tashlash"""
        if vehicle_id in self.devices:
            del self.devices[vehicle_id]
            return True
        if vehicle_id in self.emergency_devices:
            del self.emergency_devices[vehicle_id]
            return True
        return False
    
    def get_device(self, vehicle_id: str) -> Optional[GPSDevice]:
        """Qurilmani olish"""
        return self.devices.get(vehicle_id) or self.emergency_devices.get(vehicle_id)
    
    def get_all_devices(self) -> List[GPSDevice]:
        """Barcha qurilmalar"""
        return list(self.devices.values()) + list(self.emergency_devices.values())
    
    def create_random_fleet(self, 
                           count: int = 100,
                           center: tuple = None,
                           radius_km: float = 5.0) -> List[str]:
        """
        Tasodifiy transport floti yaratish
        
        Args:
            count: Transport soni
            center: Markaz koordinatalari
            radius_km: Tarqalish radiusi
        
        Returns:
            Yaratilgan qurilmalar ID ro'yxati
        """
        created_ids = []
        
        for i in range(count):
            vehicle_id = f"VH-{i:04d}"
            device = GPSDeviceFactory.create_random_vehicle(
                vehicle_id=vehicle_id,
                center=center,
                radius_km=radius_km
            )
            self.add_device(device)
            created_ids.append(vehicle_id)
        
        print(f"✅ {count} ta transport yaratildi")
        print(f"   🚗 Oddiy: {len(self.devices)}")
        print(f"   🚨 Maxsus: {len(self.emergency_devices)}")
        
        return created_ids
    
    def start(self):
        """Ma'lumot yig'ishni boshlash"""
        self.publisher.connect()
        self.is_running = True
        self.stats["start_time"] = datetime.now()
        print("🚀 Qurilmalar boshqaruvchisi ishga tushdi")
    
    def stop(self):
        """Ma'lumot yig'ishni to'xtatish"""
        self.is_running = False
        self.publisher.disconnect()
        print("⏹️ Qurilmalar boshqaruvchisi to'xtatildi")
    
    def update_all_devices(self, dt: float = 1.0) -> List[GPSData]:
        """
        Barcha qurilmalarni yangilash
        
        Args:
            dt: Vaqt oralig'i (sekund)
        
        Returns:
            Barcha GPS ma'lumotlari
        """
        all_data = []
        
        # Oddiy qurilmalar
        for device in self.devices.values():
            gps_data = device.update_position(dt)
            self.publisher.publish_gps_data(gps_data)
            all_data.append(gps_data)
            
            if self.on_data_received:
                self.on_data_received(gps_data)
        
        # Maxsus qurilmalar
        for device in self.emergency_devices.values():
            gps_data = device.update_position(dt)
            self.publisher.publish_gps_data(gps_data)
            all_data.append(gps_data)
            
            if self.on_data_received:
                self.on_data_received(gps_data)
        
        self.stats["total_updates"] += len(all_data)
        return all_data
    
    def activate_emergency(self, vehicle_id: str, 
                           destination_lat: float,
                           destination_lng: float) -> bool:
        """
        Favqulodda rejimni yoqish
        
        Args:
            vehicle_id: Maxsus transport ID
            destination_lat: Maqsad koordinata (lat)
            destination_lng: Maqsad koordinata (lng)
        """
        device = self.emergency_devices.get(vehicle_id)
        if not device:
            return False
        
        device.activate_emergency()
        device.set_route_heading(destination_lat, destination_lng)
        
        destination = {"lat": destination_lat, "lng": destination_lng}
        gps_data = device._create_gps_data()
        
        self.publisher.publish_emergency_alert(gps_data, destination)
        
        if self.on_emergency_alert:
            self.on_emergency_alert(gps_data, destination)
        
        self.stats["emergency_alerts"] += 1
        print(f"🚨 Favqulodda signal: {vehicle_id} → ({destination_lat:.4f}, {destination_lng:.4f})")
        
        return True
    
    async def run_simulation(self, duration: int = 60):
        """
        Asinxron simulyatsiya
        
        Args:
            duration: Simulyatsiya davomiyligi (sekund)
        """
        self.start()
        
        try:
            for t in range(duration):
                if not self.is_running:
                    break
                
                self.update_all_devices(self.update_interval)
                
                # Tasodifiy favqulodda hodisa (1% ehtimollik)
                if random.random() < 0.01 and self.emergency_devices:
                    emergency_id = random.choice(list(self.emergency_devices.keys()))
                    # Tasodifiy maqsad
                    dest_lat = 41.2995 + random.uniform(-0.05, 0.05)
                    dest_lng = 69.2401 + random.uniform(-0.05, 0.05)
                    self.activate_emergency(emergency_id, dest_lat, dest_lng)
                
                await asyncio.sleep(self.update_interval)
                
                # Har 10 sekundda statistika
                if (t + 1) % 10 == 0:
                    print(f"⏱️ {t+1}s: {self.stats['total_updates']} ta yangilanish")
        
        finally:
            self.stop()
    
    def get_statistics(self) -> dict:
        """Statistika olish"""
        return {
            **self.stats,
            "total_devices": len(self.devices) + len(self.emergency_devices),
            "regular_devices": len(self.devices),
            "emergency_devices": len(self.emergency_devices)
        }


# Test uchun
if __name__ == "__main__":
    manager = DeviceManager(use_mqtt=False)
    
    # 50 ta transport yaratish
    manager.create_random_fleet(count=50)
    
    # Sinxron test
    manager.start()
    
    for _ in range(5):
        data = manager.update_all_devices(1.0)
        print(f"📍 {len(data)} ta ma'lumot yangilandi")
    
    print("\n📊 Statistika:")
    for key, value in manager.get_statistics().items():
        print(f"   {key}: {value}")
    
    manager.stop()
