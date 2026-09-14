from fastapi import APIRouter, Response
from ..services.recorder import CanRecorder

def create_logging_router(recorder: CanRecorder) -> APIRouter:
    router = APIRouter(prefix="/api", tags=["Logging & Recording"])

    @router.post("/record/start")
    def start_recording():
        recorder.start()
        return {"success": True, "message": "Recording started."}

    @router.post("/record/stop")
    def stop_recording():
        summary = recorder.stop()
        return {"success": True, "message": "Recording stopped.", **summary}

    @router.get("/logs")
    def get_logs(format: str = "json"):
        if format == "csv":
            csv_data = recorder.export_csv()
            return Response(
                content=csv_data,
                media_type="text/csv",
                headers={"Content-Disposition": 'attachment; filename="canscope_capture.csv"'}
            )
        return {
            "isRecording": recorder.is_recording,
            "frameCount": recorder.frame_count,
            "frames": recorder.export_json()[-2000:]
        }

    return router
