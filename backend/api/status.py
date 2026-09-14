from fastapi import APIRouter
from ..can.manager import CanManager

def create_status_router(manager: CanManager) -> APIRouter:
    router = APIRouter(prefix="/api", tags=["Status"])

    @router.get("/system")
    def get_system_info():
        return manager.discover_system()

    @router.get("/status")
    def get_bus_status():
        return manager.get_status()

    @router.get("/interfaces")
    def get_interfaces():
        sys_info = manager.discover_system()
        return sys_info.detectedInterfaces

    @router.get("/errors")
    def get_errors():
        status = manager.get_status()
        return {
            "busState": status.busState,
            "tec": status.tec,
            "rec": status.rec,
            "errorFrames": status.errorFrames,
            "controllerState": status.controllerState,
            "recentErrors": []
        }

    return router
