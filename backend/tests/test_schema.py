import json


def test_api_docs_are_public(client):
    docs = client.get("/api/docs")
    schema = client.get("/api/schema", {"format": "json"})

    assert docs.status_code == 200
    assert "swagger-ui" in docs.content.decode()
    assert schema.status_code == 200
    body = json.loads(schema.content)
    assert body["info"]["title"] == "BrandVault API"
    paths = body["paths"]
    assert "/api/health" in paths
    assert "/api/assets/{id}/ai-tags" in paths
    assert "/api/assets/{id}/ai-tags/save" in paths
    assert "bearerAuth" in body["components"]["securitySchemes"]
