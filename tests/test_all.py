"""
Loyiha Testlari

Asosiy komponentlarni tekshirish
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def test_gps_device():
    """GPS datchik testi"""
    from src.iot.gps_device import GPSDevice, GPSDeviceFactory, VehicleType
    
    # Qurilma yaratish
    device = GPSDeviceFactory.create_random_vehicle("TEST-001")
    assert device.vehicle_id == "TEST-001"
    assert device.latitude is not None
    assert device.longitude is not None
    
    # Joylashuv yangilash
    old_lat = device.latitude
    gps_data = device.update_position(1.0)
    assert gps_data.latitude != old_lat or gps_data.speed == 0
    
    print("✅ GPS Device testi muvaffaqiyatli")


def test_device_manager():
    """Device Manager testi"""
    from src.iot.device_manager import DeviceManager
    
    manager = DeviceManager(use_mqtt=False)
    
    # Fleet yaratish
    ids = manager.create_random_fleet(count=10)
    assert len(ids) == 10
    
    # Qurilmalarni olish
    devices = manager.get_all_devices()
    assert len(devices) == 10
    
    # Yangilash
    manager.start()
    data = manager.update_all_devices(1.0)
    assert len(data) == 10
    manager.stop()
    
    print("✅ Device Manager testi muvaffaqiyatli")


def test_traffic_analyzer():
    """Traffic Analyzer testi"""
    from src.models.traffic_analyzer import TrafficAnalyzer
    
    analyzer = TrafficAnalyzer()
    
    # Grid yaratish
    analyzer.create_grid_segments(
        center=(41.2995, 69.2401),
        grid_size=3
    )
    assert len(analyzer.segments) == 9
    
    # Transport qo'shish
    analyzer.update_vehicle("VH-001", 41.2995, 69.2401, 50)
    
    # Tahlil
    overview = analyzer.get_city_overview()
    assert "total_vehicles" in overview
    
    print("✅ Traffic Analyzer testi muvaffaqiyatli")


def test_congestion_predictor():
    """Congestion Predictor testi"""
    from src.models.congestion_predictor import CongestionPredictor
    from datetime import datetime
    
    predictor = CongestionPredictor()
    
    # Ma'lumot qo'shish
    for i in range(10):
        predictor.add_observation("SEG-01-01", 50 + i)
    
    # Bashorat
    result = predictor.predict("SEG-01-01")
    assert result.segment_id == "SEG-01-01"
    assert len(result.predictions) == 3
    
    print("✅ Congestion Predictor testi muvaffaqiyatli")


def test_signal_optimizer():
    """Signal Optimizer testi"""
    from src.models.signal_optimizer import SignalOptimizer, IntersectionState
    
    optimizer = SignalOptimizer()
    
    state = IntersectionState(
        intersection_id="INT-001",
        north_queue=10,
        south_queue=5,
        east_queue=3,
        west_queue=2
    )
    
    # Optimallashtirish
    timing = optimizer.optimize(state)
    assert timing.ns_green >= 15
    assert timing.ew_green >= 15
    
    print("✅ Signal Optimizer testi muvaffaqiyatli")


def test_evp_controller():
    """EVP Controller testi"""
    from src.emergency.evp_controller import EVPController, EmergencyVehicle, EmergencyType
    
    controller = EVPController()
    
    # Chorraha qo'shish
    controller.route_predictor.add_intersection("INT-01", 41.30, 69.24)
    controller.route_predictor.add_intersection("INT-02", 41.31, 69.25)
    controller.route_predictor.add_connection("INT-01", "INT-02")
    
    # Transport ro'yxatga olish
    vehicle = EmergencyVehicle(
        vehicle_id="AMB-001",
        vehicle_type=EmergencyType.AMBULANCE,
        latitude=41.30,
        longitude=69.24
    )
    controller.register_vehicle(vehicle)
    
    # Status
    status = controller.get_status()
    assert status["total_registered"] == 1
    
    print("✅ EVP Controller testi muvaffaqiyatli")


def test_city_simulator():
    """City Simulator testi"""
    from src.simulation.city_simulator import CitySimulator, SimulationConfig
    
    config = SimulationConfig(
        vehicle_count=20,
        grid_size=3
    )
    
    simulator = CitySimulator(config)
    simulator.setup()
    
    # Bir necha qadam
    for _ in range(5):
        result = simulator.step()
        assert "step" in result
        assert "vehicles" in result
    
    # Dashboard data
    data = simulator.get_dashboard_data()
    assert "vehicles" in data
    assert "signals" in data
    
    print("✅ City Simulator testi muvaffaqiyatli")


def run_all_tests():
    """Barcha testlarni ishga tushirish"""
    print("\n" + "="*50)
    print("🧪 TESTLAR BOSHLANMOQDA")
    print("="*50 + "\n")
    
    tests = [
        test_gps_device,
        test_device_manager,
        test_traffic_analyzer,
        test_congestion_predictor,
        test_signal_optimizer,
        test_evp_controller,
        test_city_simulator
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            test()
            passed += 1
        except Exception as e:
            print(f"❌ {test.__name__} XATO: {e}")
            failed += 1
    
    print("\n" + "="*50)
    print(f"📊 NATIJA: {passed} muvaffaqiyatli, {failed} xato")
    print("="*50)
    
    return failed == 0


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
