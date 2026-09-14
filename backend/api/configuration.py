from fastapi import APIRouter, HTTPException
from ..can.manager import CanManager
from ..can.models import CanConfigModel, CanFrameModel

def create_configuration_router(manager: CanManager) -> APIRouter:
    router = APIRouter(prefix="/api", tags=["Configuration & Transmit"])

    @router.get("/config")
    def get_config():
        if manager._config:
            return manager._config
        return CanConfigModel()

    @router.post("/configure")
    def update_config(config: CanConfigModel):
        success = manager.configure(config)
        return {"success": success, "config": config, "status": manager.get_status()}

    @router.post("/transmit")
    def transmit_frame(frame: CanFrameModel):
        status = manager.get_status()
        if status.connectionState != "connected":
            raise HTTPException(status_code=400, detail={"error": "NOT_CONNECTED", "message": "CAN controller is not connected."})

        if status.listenOnly:
            raise HTTPException(
                status_code=403,
                detail={"error": "LISTEN_ONLY_MODE", "message": "Transmission is strictly prohibited in Listen-Only mode."}
            )

        # Validate CAN ID limits
        if not frame.extended and frame.id > 0x7FF:
            raise HTTPException(status_code=400, detail={"error": "INVALID_ID", "message": "Standard CAN ID must be <= 0x7FF."})
        if frame.extended and frame.id > 0x1FFFFFFF:
            raise HTTPException(status_code=400, detail={"error": "INVALID_ID", "message": "Extended CAN ID must be <= 0x1FFFFFFF."})

        success = manager.send(frame)
        if not success:
            raise HTTPException(status_code=500, detail={"error": "TRANSMIT_FAILED", "message": "Bus transmission rejected."})

        return {"success": True, "message": "Frame transmitted."}

    return router
