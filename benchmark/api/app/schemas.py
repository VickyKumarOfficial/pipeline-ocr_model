"""API response shapes. The frontend's TypeScript types are generated from these (OpenAPI)."""

from datetime import datetime

from pydantic import BaseModel


class CategoryOut(BaseModel):
    id: str
    label: str
    metric: str
    focus: bool
    sample_count: int


class RunOut(BaseModel):
    id: str
    created_at: datetime
    is_demo: bool
    git_commit: str | None
    manifest_sha256: str | None
    thresholds_sha256: str | None
    prompt: str | None
    machines: dict[str, str]
    notes: str


class PipelineStep(BaseModel):
    id: str
    name: str
    default_on: bool
    optional: bool


class ModelOut(BaseModel):
    id: str
    name: str
    family: str
    kind: str
    platform: str
    params: str | None
    license: str | None
    needs_prompt: bool
    summary: str
    covers: list[str]
    pipeline: list[PipelineStep]
    status: str


class CategoryScore(BaseModel):
    category: str
    score: float | None  # mean 0-100; None = model not meant for this category
    n: int


class LeaderboardRow(BaseModel):
    model: ModelOut
    rank: int | None
    focus_score: float | None  # mean over the focus categories the model covers
    focus_coverage: int  # how many of the focus categories it covers
    scores: list[CategoryScore]
    capability_score: float | None  # weighted PASS score (STAGES.md ranking step 2), 0-100
    hallucination_gate: str  # pass | flagged | untested
    p50_ms: float | None
    p95_ms: float | None
    peak_mem_mb: float | None
    errors: int


class Overview(BaseModel):
    run: RunOut
    config: str
    categories: list[CategoryOut]
    rows: list[LeaderboardRow]


class StageOut(BaseModel):
    id: str
    group: str
    name: str
    priority: str
    collect: str
    source: str
    evidence: str


class Cell(BaseModel):
    model_id: str
    stage_id: str
    claim: bool | None
    claim_source: str | None
    test: str


class Checklist(BaseModel):
    run: RunOut
    config: str
    groups: dict[str, str]
    stages: list[StageOut]
    models: list[ModelOut]
    cells: list[Cell]


class AblationOut(BaseModel):
    flag: str
    label: str
    score_off: float
    score_on: float


class SampleBrief(BaseModel):
    id: str
    category: str
    image_url: str
    score: float | None


class ModelDetail(BaseModel):
    run: RunOut
    model: ModelOut
    scores: dict[str, list[CategoryScore]]  # config -> scores
    latencies_ms: dict[str, list[float]]  # config -> per-sample times
    peak_mem_mb: dict[str, float | None]
    load_ms: dict[str, float | None]
    weights_mb: float | None
    ablations: list[AblationOut]
    tests: dict[str, dict[str, int]]  # config -> PASS/PARTIAL/FAIL/N/T counts
    worst: list[SampleBrief]


class SampleOut(BaseModel):
    id: str
    category: str
    stage_ids: list[str]
    file_format: str
    sha256: str
    image_url: str
    width: int
    height: int
    source: str
    license: str
    ground_truth: dict[str, str]
    gt_kind: str


class SampleListItem(BaseModel):
    sample: SampleOut
    best_score: float | None
    worst_score: float | None
    mean_score: float | None


class PredictionOut(BaseModel):
    model: ModelOut
    output: str
    lines: list[dict]
    stages_run: list[str]
    total_ms: float
    peak_mem_mb: float
    error: str | None
    score: float | None
    metrics: dict


class SampleDetail(BaseModel):
    run: RunOut
    config: str
    sample: SampleOut
    category_metric: str
    predictions: list[PredictionOut]
    not_run: list[ModelOut]  # models meant for this category with no output yet
