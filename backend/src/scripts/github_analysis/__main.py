"""Allow `python -m github_analysis …`."""
from .repo_scan import run_cli

if __name__ == "__main__":
    run_cli()
