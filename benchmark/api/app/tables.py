"""Database tables. Mirrors PIPELINE.md §4 (unified prediction, run manifest)."""

from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


class Model(Base):
    __tablename__ = "models"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(128))
    family: Mapped[str] = mapped_column(String(64))  # paddle | challenger | baseline
    kind: Mapped[str] = mapped_column(String(32))  # pipeline | vlm | specialist | api
    platform: Mapped[str] = mapped_column(String(64))  # where it runs, e.g. "M4 CPU", "Colab T4"
    params: Mapped[str | None] = mapped_column(String(32))
    license: Mapped[str | None] = mapped_column(String(64))
    needs_prompt: Mapped[bool] = mapped_column(Boolean, default=False)
    summary: Mapped[str] = mapped_column(Text, default="")
    # Category ids this model is meant to handle; others show as "not applicable".
    covers: Mapped[list] = mapped_column(JSON, default=list)
    # Internal stages in execution order: [{"id", "name", "default_on"}]
    pipeline: Mapped[list] = mapped_column(JSON, default=list)
    status: Mapped[str] = mapped_column(String(32), default="tested")  # tested | pending


class Stage(Base):
    """One row of STAGES.md."""

    __tablename__ = "stages"

    id: Mapped[str] = mapped_column(String(8), primary_key=True)
    group: Mapped[str] = mapped_column(String(1))
    name: Mapped[str] = mapped_column(Text)
    priority: Mapped[str] = mapped_column(String(16))
    collect: Mapped[str] = mapped_column(Text, default="")
    source: Mapped[str] = mapped_column(Text, default="")
    evidence: Mapped[str] = mapped_column(String(16), default="")
    position: Mapped[int] = mapped_column(Integer)


class Run(Base):
    """One benchmark run (PIPELINE.md §4.4)."""

    __tablename__ = "runs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    git_commit: Mapped[str | None] = mapped_column(String(64))
    manifest_sha256: Mapped[str | None] = mapped_column(String(64))
    thresholds_sha256: Mapped[str | None] = mapped_column(String(64))
    prompt: Mapped[str | None] = mapped_column(Text)
    machines: Mapped[dict] = mapped_column(JSON, default=dict)  # platform -> description
    notes: Mapped[str] = mapped_column(Text, default="")


class Sample(Base):
    __tablename__ = "samples"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    category: Mapped[str] = mapped_column(String(64))
    stage_ids: Mapped[list] = mapped_column(JSON, default=list)
    file_format: Mapped[str] = mapped_column(String(16))
    sha256: Mapped[str] = mapped_column(String(64))
    image_url: Mapped[str] = mapped_column(Text)
    width: Mapped[int] = mapped_column(Integer)
    height: Mapped[int] = mapped_column(Integer)
    source: Mapped[str] = mapped_column(Text, default="")
    license: Mapped[str] = mapped_column(String(64), default="")
    # Ground truth: {"text": ..., "latex": ..., "smiles": ...}
    ground_truth: Mapped[dict] = mapped_column(JSON, default=dict)
    gt_kind: Mapped[str] = mapped_column(String(16))  # text | latex | smiles


class Prediction(Base):
    """One model's output on one sample (PIPELINE.md §4.2), plus its score."""

    __tablename__ = "predictions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[str] = mapped_column(ForeignKey("runs.id"), index=True)
    model_id: Mapped[str] = mapped_column(ForeignKey("models.id"), index=True)
    config: Mapped[str] = mapped_column(String(16))  # default | full
    sample_id: Mapped[str] = mapped_column(ForeignKey("samples.id"), index=True)
    output: Mapped[str] = mapped_column(Text, default="")  # text_full, latex or smiles
    lines: Mapped[list] = mapped_column(JSON, default=list)  # [{"text", "poly", "score"}]
    stages_run: Mapped[list] = mapped_column(JSON, default=list)
    total_ms: Mapped[float] = mapped_column(Float)
    peak_mem_mb: Mapped[float] = mapped_column(Float)
    error: Mapped[str | None] = mapped_column(Text)
    score: Mapped[float | None] = mapped_column(Float)  # 0-100, category's primary metric
    metrics: Mapped[dict] = mapped_column(JSON, default=dict)  # all metrics, native units


class ModelLoad(Base):
    """Per model per config: one-off costs, kept apart from per-sample timing."""

    __tablename__ = "model_loads"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[str] = mapped_column(ForeignKey("runs.id"), index=True)
    model_id: Mapped[str] = mapped_column(ForeignKey("models.id"))
    config: Mapped[str] = mapped_column(String(16))
    load_ms: Mapped[float] = mapped_column(Float)
    weights_mb: Mapped[float] = mapped_column(Float)
    device: Mapped[str] = mapped_column(String(64))
    packages: Mapped[dict] = mapped_column(JSON, default=dict)


class ChecklistCell(Base):
    """CLAIM / TEST for one stage and one model (PIPELINE.md §3.2)."""

    __tablename__ = "checklist"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[str] = mapped_column(ForeignKey("runs.id"), index=True)
    model_id: Mapped[str] = mapped_column(ForeignKey("models.id"))
    config: Mapped[str] = mapped_column(String(16))
    stage_id: Mapped[str] = mapped_column(ForeignKey("stages.id"))
    claim: Mapped[bool | None] = mapped_column(Boolean)
    claim_source: Mapped[str | None] = mapped_column(String(64))
    test: Mapped[str] = mapped_column(String(8))  # PASS | PARTIAL | FAIL | N/T
    note: Mapped[str] = mapped_column(Text, default="")


class Ablation(Base):
    """Optional stage switched on vs off, everything else equal (STAGES.md ranking step 3)."""

    __tablename__ = "ablations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[str] = mapped_column(ForeignKey("runs.id"), index=True)
    model_id: Mapped[str] = mapped_column(ForeignKey("models.id"))
    flag: Mapped[str] = mapped_column(String(64))
    label: Mapped[str] = mapped_column(String(128))
    score_off: Mapped[float] = mapped_column(Float)
    score_on: Mapped[float] = mapped_column(Float)
