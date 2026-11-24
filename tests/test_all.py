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
    from src.services.traffic_analyzer import TrafficAnalyzer
    
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
    from src.ai.congestion_predictor import CongestionPredictor
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
    from src.services.signal_optimizer import SignalOptimizer, IntersectionState
    
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
    from src.services.evp_controller import EVPController, EmergencyVehicle, EmergencyType
    
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
    """City Simulator testi — Toshkent grafi, chorrahalar va mashinalar"""
    from src.simulation.city_simulator import CitySimulator

    simulator = CitySimulator(vehicle_count=60, seed=0)
    assert 12 <= len(simulator.intersections) <= 20
    for _ in range(5):
        snapshot = simulator.step()
    assert len(snapshot["vehicles"]) == 60
    for v in snapshot["vehicles"]:
        assert 41.28 < v["lat"] < 41.34 and 69.24 < v["lng"] < 69.32   # Toshkent markazi

    print("✅ City Simulator testi muvaffaqiyatli")


def test_dqn_inference():
    """DQN: NumPy inference shakli va argmax; server torch'siz ishlaydi"""
    import numpy as np
    import src.api.main  # noqa: F401 — server modullari torch'ni import qilmasligi kerak
    from src.ai.dqn_policy import ACTIONS, DQNPolicy, make_state

    assert "torch" not in sys.modules
    policy = DQNPolicy()
    state = make_state(12, 3, 4)
    np.testing.assert_allclose(state, [12 / 50, 3 / 50, 0.4], rtol=1e-6)
    q = policy.q_values(state)
    assert q.shape == (4,)
    assert policy.act(state) == int(np.argmax(q))
    batch = policy.q_values(np.stack([state, make_state(0, 20, 1), make_state(30, 0, 9)]))
    assert batch.shape == (3, 4)
    np.testing.assert_allclose(batch[0], q, rtol=1e-5)
    assert len(ACTIONS) == 4 and ACTIONS[2] == ("NS", 30)

    print("✅ DQN inference testi muvaffaqiyatli")


def test_fixed_signal_cycle():
    """Fiks taymer: 30 s yashil → 3 s sariq → 2 s qizil → boshqa o'q"""
    from src.simulation.signals import SignalController, fixed_decide

    c = SignalController(fixed_decide, phase="NS", initial_green=30)
    states = []
    for _ in range(70):
        c.tick(1.0)
        states.append((c.phase, c.state))
    assert states[28] == ("NS", "green")
    assert states[29] == ("NS", "yellow") and states[32] == ("NS", "allred")
    assert states[34] == ("EW", "green") and states[63] == ("EW", "green")
    assert states[64] == ("EW", "yellow")

    print("✅ Fiks svetofor sikli testi muvaffaqiyatli")


def _check_snapshot(snapshot):
    assert set(snapshot) == {"t", "mode", "stats", "vehicles", "intersections",
                             "zones", "emergency", "events"}
    assert isinstance(snapshot["t"], str) and snapshot["mode"] in ("ai", "fixed")
    stats = snapshot["stats"]
    assert set(stats) == {"vehicles", "avgSpeed", "avgWait", "avgWaitAi",
                          "avgWaitFixed", "congestion"}
    assert all(isinstance(v, (int, float)) for v in stats.values())
    assert 0 <= stats["congestion"] <= 100
    for v in snapshot["vehicles"]:
        assert set(v) == {"id", "lat", "lng", "heading", "speed", "type", "emergency"}
        assert v["type"] in ("car", "bus", "truck", "ambulance")
    for it in snapshot["intersections"]:
        assert set(it) == {"id", "name", "lat", "lng", "phase", "state", "remaining",
                           "queue", "wait", "action", "q", "preempted"}
        assert it["phase"] in ("NS", "EW") and it["state"] in ("green", "yellow", "allred")
        assert set(it["queue"]) == {"ns", "ew"} and it["action"] in (0, 1, 2, 3)
        assert len(it["q"]) == 4 and isinstance(it["preempted"], bool)
    for z in snapshot["zones"]:
        assert set(z) == {"id", "lat", "lng", "radius", "count", "level"}
        assert z["level"] in ("light", "moderate", "heavy")
    assert len(snapshot["events"]) <= 20
    for e in snapshot["events"]:
        assert {"id", "t", "kind", "text"} <= set(e)
        assert e["kind"] in ("phase", "zone", "emergency", "mode", "gps")


def test_snapshot_schema():
    """Snapshot kontrakt (docs/dashboard-api.md) kalitlari va turlari"""
    from src.simulation.city_simulator import CitySimulator

    simulator = CitySimulator(vehicle_count=120, seed=1)
    for _ in range(60):
        snapshot = simulator.step()
    _check_snapshot(snapshot)
    assert snapshot["events"], "60 s ichida kamida bitta faza voqeasi bo'lishi kerak"

    print("✅ Snapshot sxemasi testi muvaffaqiyatli")


def test_fair_comparison():
    """Soya simulyatsiyalari: bir xil kelish oqimi, manfiy bo'lmagan kutish"""
    import math
    from src.simulation.city_simulator import CitySimulator

    simulator = CitySimulator(vehicle_count=150, seed=2)
    for _ in range(300):
        snapshot = simulator.step()
    for it in simulator.intersections:
        assert it.shadow_ai.arrived == it.shadow_fixed.arrived
    assert sum(it.shadow_ai.arrived for it in simulator.intersections) > 0
    stats = snapshot["stats"]
    for key in ("avgWait", "avgWaitAi", "avgWaitFixed"):
        assert stats[key] >= 0 and math.isfinite(stats[key])

    print("✅ Adolatli taqqoslash testi muvaffaqiyatli")


def test_api_mode_and_emergency():
    """REST: /api/state, /api/mode, /api/emergency/route, /api/roads, tarix"""
    from fastapi.testclient import TestClient
    from src.api.main import app

    with TestClient(app) as client:
        _check_snapshot(client.get("/api/state").json())

        assert client.post("/api/mode", json={"mode": "fixed"}).json() == {"mode": "fixed"}
        assert client.get("/api/state").json()["mode"] == "fixed"
        assert client.post("/api/mode", json={"mode": "turbo"}).status_code == 422
        assert client.post("/api/mode", json={"mode": "ai"}).json() == {"mode": "ai"}

        # Navoiy ko'chasi (shimol) → Amir Temur — Shahrisabz (janub)
        res = client.post("/api/emergency/route",
                          json={"from": [41.3206, 69.2647], "to": [41.3029, 69.2792]})
        assert res.status_code == 200
        em = res.json()
        assert set(em) == {"id", "route", "intersections", "eta", "vehicleId"}
        assert len(em["route"]) >= 2 and isinstance(em["eta"], int) and em["eta"] > 0
        assert em["intersections"], "marshrut kamida bitta signal chorrahasidan o'tishi kerak"
        state = client.get("/api/state").json()
        assert state["emergency"]["id"] == em["id"]
        assert any(v["id"] == em["vehicleId"] and v["emergency"] for v in state["vehicles"])

        assert client.delete("/api/emergency").json() == {"ok": True}
        assert client.get("/api/state").json()["emergency"] is None
        far = client.post("/api/emergency/route", json={"from": [41.0, 69.0], "to": [41.3, 69.27]})
        assert far.status_code == 422

        roads = client.get("/api/roads").json()
        assert roads["type"] == "FeatureCollection" and roads["features"]
        assert roads["features"][0]["geometry"]["type"] == "LineString"
        history = client.get("/api/intersections/i01/history?minutes=10").json()
        assert "points" in history
        assert client.get("/api/intersections/nope/history").status_code == 404

    print("✅ API testi muvaffaqiyatli")


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
        test_city_simulator,
        test_dqn_inference,
        test_fixed_signal_cycle,
        test_snapshot_schema,
        test_fair_comparison,
        test_api_mode_and_emergency,
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
