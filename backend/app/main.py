"""
FastAPI应用入口
参考README.md的API设计规范和核心功能模块
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import settings
from app.core.exceptions import CustomException

# 创建FastAPI应用实例
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    docs_url=f"{settings.API_V1_PREFIX}/docs",
    redoc_url=f"{settings.API_V1_PREFIX}/redoc",
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 全局异常处理
@app.exception_handler(CustomException)
async def custom_exception_handler(request, exc: CustomException):
    """自定义异常处理器"""
    return JSONResponse(
        status_code=exc.code,
        content={
            "code": exc.code,
            "message": exc.message,
            "details": exc.details
        }
    )


@app.exception_handler(Exception)
async def global_exception_handler(request, exc: Exception):
    """全局异常处理器"""
    return JSONResponse(
        status_code=500,
        content={
            "code": 500,
            "message": "Internal server error",
            "details": str(exc) if settings.DEBUG else None
        }
    )


# 健康检查接口
@app.get("/health")
async def health_check():
    """健康检查"""
    return {
        "code": 200,
        "message": "success",
        "data": {
            "status": "healthy",
            "version": settings.VERSION
        }
    }


# 根路径
@app.get("/")
async def root():
    """根路径"""
    return {
        "code": 200,
        "message": "success",
        "data": {
            "name": settings.PROJECT_NAME,
            "version": settings.VERSION,
            "docs": f"{settings.API_V1_PREFIX}/docs"
        }
    }


# 注册统一API路由
# 所有API路由统一在 app/api/ 文件夹中管理，通过 router.py 集中注册
# 新增API只需在 app/api/ 下新建文件，然后在 app/api/router.py 中注册即可
from app.api.router import api_router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


# 启动事件
@app.on_event("startup")
async def startup_event():
    """应用启动时执行"""
    print(f"🚀 {settings.PROJECT_NAME} v{settings.VERSION} is starting...")
    print(f"📝 API documentation: http://{settings.HOST}:{settings.PORT}{settings.API_V1_PREFIX}/docs")


# 关闭事件
@app.on_event("shutdown")
async def shutdown_event():
    """应用关闭时执行"""
    print(f"👋 {settings.PROJECT_NAME} is shutting down...")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
