import uuid

from tests.conftest import auth


def test_register_creates_citizen_only(client):
    email = f"c_{uuid.uuid4().hex[:8]}@example.com"
    r = client.post(
        "/api/auth/register",
        json={"email": email, "password": "Passw0rd!", "full_name": "Jane"},
    )
    assert r.status_code == 201
    body = r.json()
    # Public registration must never grant officer/admin.
    assert body["user"]["role"] == "citizen"
    assert body["access_token"]


def test_login_and_me(client):
    email = f"c_{uuid.uuid4().hex[:8]}@example.com"
    client.post(
        "/api/auth/register",
        json={"email": email, "password": "Passw0rd!", "full_name": "Jane"},
    )
    r = client.post("/api/auth/login", json={"email": email, "password": "Passw0rd!"})
    assert r.status_code == 200
    token = r.json()["access_token"]
    me = client.get("/api/auth/me", headers=auth(token))
    assert me.status_code == 200
    assert me.json()["email"] == email


def test_login_wrong_password(client):
    email = f"c_{uuid.uuid4().hex[:8]}@example.com"
    client.post(
        "/api/auth/register",
        json={"email": email, "password": "Passw0rd!", "full_name": "Jane"},
    )
    r = client.post("/api/auth/login", json={"email": email, "password": "wrong"})
    assert r.status_code == 401


def test_unauthorized_access_blocked(client):
    r = client.get("/api/complaints/mine")
    assert r.status_code == 401

