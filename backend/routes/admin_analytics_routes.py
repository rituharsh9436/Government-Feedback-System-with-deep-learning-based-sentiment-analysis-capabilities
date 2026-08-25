from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from services.dependencies import RequireRole, get_current_user
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

def get_effective_department(user: dict, requested_department: Optional[str]) -> Optional[str]:
    user_dept = user.get("department_name")
    if user_dept == "Central" or user.get('role') == "admin":
        return requested_department
    if requested_department and requested_department != user_dept:
        raise HTTPException(status_code=403, detail="You can only access analytics for your own department")
    return user_dept

@router.get("/overview")
async def get_analytics_overview(
    department: Optional[str] = Query(None, description="Comma separated list of departments"),
    date_from: Optional[datetime] = Query(None, description="Start date filter"),
    date_to: Optional[datetime] = Query(None, description="End date filter"),
    current_user: dict = Depends(RequireRole(["admin"]))
):
    effective_dept = get_effective_department(current_user, department)
    return await get_overview(department=effective_dept, date_from=date_from, date_to=date_to)

@router.get("/trends")
async def get_analytics_trends(
    department: Optional[str] = Query(None, description="Comma separated list of departments"),
    date_from: Optional[datetime] = Query(None, description="Start date filter"),
    date_to: Optional[datetime] = Query(None, description="End date filter"),
    current_user: dict = Depends(RequireRole(["admin"]))
):
    effective_dept = get_effective_department(current_user, department)
    return await get_trends(department=effective_dept, date_from=date_from, date_to=date_to)

@router.get("/policies")
async def get_analytics_policies(
    department: Optional[str] = Query(None, description="Comma separated list of departments"),
    date_from: Optional[datetime] = Query(None, description="Start date filter"),
    date_to: Optional[datetime] = Query(None, description="End date filter"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    current_user: dict = Depends(RequireRole(["admin"]))
):
    effective_dept = get_effective_department(current_user, department)
    return await get_policies(department=effective_dept, date_from=date_from, date_to=date_to, page=page, limit=limit)

@router.get("/confidence")
async def get_analytics_confidence(
    department: Optional[str] = Query(None, description="Comma separated list of departments"),
    date_from: Optional[datetime] = Query(None, description="Start date filter"),
    date_to: Optional[datetime] = Query(None, description="End date filter"),
    current_user: dict = Depends(RequireRole(["admin"]))
):
    effective_dept = get_effective_department(current_user, department)
    return await get_confidence_distribution(department=effective_dept, date_from=date_from, date_to=date_to)
