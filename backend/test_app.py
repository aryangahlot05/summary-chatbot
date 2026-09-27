import httpx
import sys

def run_tests():
    print("Running integration tests...")
    
    # 1. Test Backend Health
    with httpx.Client(base_url="http://127.0.0.1:8000") as client:
        r = client.get("/api/health")
        assert r.status_code == 200, f"Health check failed: {r.status_code}"
        data = r.json()
        print("[PASS] Backend /api/health returned 200 OK:", data["status"])

        # 2. Test Document Upload
        test_content = b"Antigravity Intelligence Systems\n\nThis is a sample document verifying parsing."
        files = {"file": ("sample_test.txt", test_content, "text/plain")}
        r = client.post("/api/upload", files=files)
        assert r.status_code == 200, f"Upload failed: {r.status_code}, {r.text}"
        upload_resp = r.json()
        doc_id = upload_resp["doc_id"]
        print("[PASS] Document uploaded successfully, doc_id:", doc_id)

        # 3. Test Document Listing
        r = client.get("/api/documents")
        assert r.status_code == 200
        docs = r.json()
        assert any(d["id"] == doc_id for d in docs)
        print("[PASS] Document listing verified, total docs:", len(docs))

        # 4. Test Settings Update
        r = client.post("/api/settings", json={"text_model": "meta/llama-3.2-11b-vision-instruct"})
        assert r.status_code == 200
        print("[PASS] Dynamic settings update verified")

    # 5. Test Vite Frontend & Proxy
    with httpx.Client(base_url="http://localhost:5173") as client:
        r = client.get("/")
        assert r.status_code == 200
        assert "<title>DocuMind AI" in r.text
        print("[PASS] Frontend Vite serving HTML successfully")

        r = client.get("/api/health")
        assert r.status_code == 200
        print("[PASS] Vite reverse proxy forwarding /api/health to FastAPI successfully")

    print("\nALL INTEGRATION TESTS PASSED! SUCCESS")

if __name__ == "__main__":
    try:
        run_tests()
    except Exception as e:
        print("Test failed:", e)
        sys.exit(1)
