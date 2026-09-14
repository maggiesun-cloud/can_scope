from fastapi import APIRouter, HTTPException
from ..can.manager import CanManager
from ..can.models import CanConfigModel

def create_connection_router(manager: CanManager) -> APIRouter:
    router = APIRouter(prefix="/api", tags=["Connection"])

    @router.post("/connect")
    def connect_interface(config: CanConfigModel):
        try:
            success = manager.connect(config)
            return {
                "success": success,
                "status": manager.get_status()
            }
        except RuntimeError as e:
            raise HTTPException(
                status_code=400,
                detail={"error": "HARDWARE_UNAVAILABLE", "message": str(e), "offerSimulation": True}
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail={"error": "CONNECTION_FAILED", "message": str(e)})

    @router.post("/disconnect")
    def disconnect_interface():
        manager.disconnect()
        return {
            "success": True,
            "status": manager.get_status()
        }

    return router
