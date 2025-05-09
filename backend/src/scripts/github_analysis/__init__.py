"""
github_analysis package – multi‑language repository scanner.

Public API re‑exports for backward compatibility:
    analyze_repository, run_cli
"""
from .repo_scan import analyze_repository, run_cli

__all__ = ["analyze_repository", "run_cli"]
