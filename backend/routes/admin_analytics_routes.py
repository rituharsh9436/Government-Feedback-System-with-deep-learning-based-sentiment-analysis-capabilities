from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query
from services.dependencies import RequireRole
from services.admin_analytics_service import (
    get_overview,
    get_trends,
    get_policies,
    get_confidence_distribution
)

router = APIRouter(
    prefix="/admin/analytics",
    tags=["Admin Analytics"],
    dependencies=[Depends(RequireRole(["admin"]))]
)

@router.get("/overview")
async def get_analytics_overview(
    department: Optional[str] = Query(None, description="Comma separated list of departments"),
    date_from: Optional[datetime] = Query(None, description="Start date filter"),
    date_to: Optional[datetime] = Query(None, description="End date filter")
):
    return await get_overview(department=department, date_from=date_from, date_to=date_to)

@router.get("/trends")
async def get_analytics_trends(
    department: Optional[str] = Query(None, description="Comma separated list of departments"),
    date_from: Optional[datetime] = Query(None, description="Start date filter"),
    date_to: Optional[datetime] = Query(None, description="End date filter")
):
    return await get_trends(department=department, date_from=date_from, date_to=date_to)

@router.get("/policies")
async def get_analytics_policies(
    department: Optional[str] = Query(None, description="Comma separated list of departments"),
    date_from: Optional[datetime] = Query(None, description="Start date filter"),
    date_to: Optional[datetime] = Query(None, description="End date filter")
):
    return await get_policies(department=department, date_from=date_from, date_to=date_to)

@router.get("/confidence")
async def get_analytics_confidence(
    department: Optional[str] = Query(None, description="Comma separated list of departments"),
    date_from: Optional[datetime] = Query(None, description="Start date filter"),
    date_to: Optional[datetime] = Query(None, description="End date filter")
):
    return await get_confidence_distribution(department=department, date_from=date_from, date_to=date_to)
