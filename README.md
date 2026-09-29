# 🌙 CHANDRASŪTRA

### Multi-Modal Lunar Image Registration, Cross-Sensor Alignment & Mission Analysis Platform

> **CHANDRASŪTRA** is a research-oriented lunar computer-vision and mission-analysis platform designed to align, register, refine, evaluate, and analyse heterogeneous lunar observations across different imaging modalities and orbital missions.

---

## 🛰️ Overview

**CHANDRASŪTRA** is built around a fundamental problem in planetary remote sensing:

> **How can observations of the same lunar terrain, captured by different instruments, missions, resolutions, viewing geometries, illumination conditions, and sensing modalities, be accurately brought into a common spatial reference frame?**

Lunar observations are rarely acquired under identical conditions.

Two images of the same surface region can differ substantially because of:

* sensor characteristics
* spatial resolution
* viewing geometry
* illumination angle
* Sun azimuth
* incidence angle
* emission angle
* scale
* contrast
* exposure
* spectral response
* image noise
* terrain relief
* acquisition time
* instrument-specific radiometry
* cross-modal appearance differences

Traditional image registration methods can struggle when direct pixel-level similarity is no longer reliable.

CHANDRASŪTRA therefore combines:

```text
Classical Computer Vision
        +
Deep Feature Matching
        +
Cross-Modal Representation Learning
        +
Geometric Estimation
        +
Sub-Pixel Refinement
        +
Photometric Modelling
        +
Uncertainty Quantification
        +
Scientific Evaluation
        +
MLOps
```

The result is a complete processing architecture intended for **multi-instrument lunar image analysis**, with particular emphasis on workflows involving:

* **LRO NAC**
* **Chandrayaan-2 OHRC**
* **Chandrayaan-2 TMC**
* **Chandrayaan-2 IIRS**
* heterogeneous orbital lunar observations

---

# 🌕 The Core Idea

CHANDRASŪTRA treats lunar image registration not as a single algorithmic operation, but as a **multi-stage scientific pipeline**.

```text
                         CHANDRASŪTRA
                              │
                              ▼
                    ┌───────────────────┐
                    │  Image Ingestion  │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │   Preprocessing   │
                    └─────────┬─────────┘
                              │
                              ▼
             ┌─────────────────────────────────┐
             │ Feature Extraction & Matching   │
             │                                 │
             │ SIFT │ LoFTR │ RoMa │ LightGlue│
             └────────────────┬────────────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │ Cross-Modal       │
                    │ Alignment         │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │ Geometric         │
                    │ Estimation        │
                    │                   │
                    │ RANSAC / Affine   │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │ Sub-Pixel         │
                    │ Refinement        │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │ Uncertainty       │
                    │ Quantification    │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │ Scientific        │
                    │ Evaluation        │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │ Result / Report   │
                    └───────────────────┘
```

---

# 🎯 Problem Statement

Lunar surface datasets are fragmented across missions and instruments.

A region observed by one instrument may have a corresponding observation from another instrument, but the images may not be directly comparable.

For example:

```text
Chandrayaan-2 OHRC
       │
       │
       ├──── Different resolution
       ├──── Different illumination
       ├──── Different spectral response
       ├──── Different viewing geometry
       └──── Different image statistics
                    │
                    ▼
               Same lunar terrain
                    ▲
                    │
       ┌────────────┴────────────┐
       │                         │
    LRO NAC                    TMC
```

A simple pixel-to-pixel comparison can therefore fail even when two images contain the same geological structures.

CHANDRASŪTRA addresses this through a hierarchy of representations:

```text
Pixels
  ↓
Enhanced Images
  ↓
Local Features
  ↓
Dense / Sparse Correspondences
  ↓
Cross-Modal Embeddings
  ↓
Geometric Constraints
  ↓
Sub-Pixel Alignment
  ↓
Uncertainty
  ↓
Scientific Metrics
```

---

# 🔬 Scientific Objective

The system is designed around five major objectives:

### 1. Cross-Sensor Registration

Align observations acquired by different lunar instruments.

### 2. Robust Correspondence Discovery

Find reliable image correspondences despite substantial visual differences.

### 3. Geometric Consistency

Estimate a transformation supported by geometrically consistent matches.

### 4. Sub-Pixel Refinement

Improve the final alignment beyond coarse feature-level localization.

### 5. Quantitative Validation

Provide measurable evidence for registration quality instead of relying only on visual inspection.

---

# 🧠 System Architecture

CHANDRASŪTRA consists of several interconnected layers.

```text
┌───────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                        │
│                                                               │
│ Next.js / React / TypeScript                                  │
│                                                               │
│ Mission Dashboard                                             │
│ Orbital Registration                                          │
│ Photometric Laboratory                                        │
│ DEM / Elevation Analysis                                      │
│ Telemetry Archive                                             │
│ Spectral Analysis                                             │
│ Rover Simulation                                              │
└──────────────────────────────┬────────────────────────────────┘
                               │
                               │ HTTP / SSE
                               ▼
┌───────────────────────────────────────────────────────────────┐
│                       API / APPLICATION LAYER                 │
│                                                               │
│ FastAPI                                                       │
│ Async orchestration                                           │
│ Job management                                                │
│ Validation                                                    │
│ Progress streaming                                            │
└──────────────────────────────┬────────────────────────────────┘
                               │
                               ▼
┌───────────────────────────────────────────────────────────────┐
│                    SCIENTIFIC PROCESSING LAYER                │
│                                                               │
│ Ingestion                                                     │
│ Preprocessing                                                 │
│ Feature extraction                                            │
│ Matching                                                      │
│ Cross-modal alignment                                         │
│ Geometry                                                      │
│ Refinement                                                    │
│ Evaluation                                                    │
│ Photometric modelling                                         │
└──────────────────────────────┬────────────────────────────────┘
                               │
                               ▼
┌───────────────────────────────────────────────────────────────┐
│                         ML / MLOps                            │
│                                                               │
│ PyTorch                                                       │
│ DINOv2                                                        │
│ LoFTR                                                         │
│ RoMa                                                          │
│ LightGlue                                                     │
│ Learned refinement                                            │
│ Contrastive training                                          │
│ Model registry                                                │
│ Evaluation gates                                              │
└──────────────────────────────┬────────────────────────────────┘
                               │
                               ▼
┌───────────────────────────────────────────────────────────────┐
│                         DATA LAYER                            │
│                                                               │
│ Image data                                                    │
│ SHA-256 provenance                                            │
│ PostgreSQL / Supabase                                         │
│ SQLAlchemy                                                    │
│ Job state                                                      │
│ Model metadata                                                │
│ Evaluation results                                            │
└───────────────────────────────────────────────────────────────┘
```

---

# 🏗️ Repository Architecture

```text
CHANDRASŪTRA/
│
├── Backend/
│   │
│   ├── backend/
│   │   ├── app/
│   │   │   │
│   │   │   ├── api/
│   │   │   │   └── API endpoints and application interfaces
│   │   │   │
│   │   │   ├── core/
│   │   │   │   └── Core configuration and infrastructure
│   │   │   │
│   │   │   ├── evaluation/
│   │   │   │   └── Scientific registration metrics
│   │   │   │
│   │   │   ├── geometry/
│   │   │   │   └── Homography / affine estimation
│   │   │   │
│   │   │   ├── ingestion/
│   │   │   │   └── Image loading and provenance
│   │   │   │
│   │   │   ├── matching/
│   │   │   │   └── Feature matching algorithms
│   │   │   │
│   │   │   ├── mlops/
│   │   │   │   └── Model registry and training infrastructure
│   │   │   │
│   │   │   ├── pipelines/
│   │   │   │   └── End-to-end orchestration
│   │   │   │
│   │   │   ├── preprocessing/
│   │   │   │   └── Image normalization and enhancement
│   │   │   │
│   │   │   └── refinement/
│   │   │       └── Sub-pixel registration
│   │   │
│   │   ├── ml/
│   │   │   └── models/
│   │   │
│   │   ├── scripts/
│   │   │
│   │   └── tests/
│   │
│   ├── configs/
│   │
│   ├── ml/
│   │   ├── configs/
│   │   ├── inference/
│   │   ├── models/
│   │   └── training/
│   │
│   ├── test_data/
│   │
│   ├── .env.example
│   ├── .gitignore
│   ├── MODEL_CARD.md
│   ├── README-RUN.md
│   ├── README_ORIGINAL.md
│   ├── check_setup.py
│   ├── docker-compose.supabase.yml
│   ├── pyproject.toml
│   ├── requirements.txt
│   └── run.py
│
└── Frontend/
    │
    ├── src/
    │   ├── app/
    │   │   ├── api/
    │   │   ├── lunar/
    │   │   └── mission/
    │   │
    │   ├── components/
    │   │
    │   ├── lib/
    │   │
    │   └── stores/
    │
    ├── prisma/
    │
    ├── public/
    │
    ├── db/
    │
    ├── package.json
    ├── bun.lock
    ├── next.config.ts
    ├── tsconfig.json
    ├── tailwind.config.ts
    ├── README.md
    └── README-RUN.md
```

---

# 🔭 End-to-End Scientific Pipeline

## Stage 1 — Data Ingestion

The first stage accepts lunar imagery and converts it into a controlled internal representation.

```text
Input Image
     │
     ▼
Image Loader
     │
     ├── OpenCV
     │
     └── PIL fallback
     │
     ▼
Dimension Validation
     │
     ▼
SHA-256 Hash
     │
     ▼
Validated Image Object
```

### Why SHA-256?

Every image is associated with a cryptographic hash.

This allows the system to preserve data provenance and identify whether an input image has changed.

```text
Image
  ↓
SHA-256
  ↓
Unique content fingerprint
```

### Image Safety

The ingestion layer also applies a maximum-dimension guard.

This helps prevent accidental processing of extremely large images that could cause uncontrolled memory consumption.

---

# 🌑 Stage 2 — Lunar Image Preprocessing

Lunar imagery can exhibit severe illumination differences.

A surface photographed near the terminator can have:

* extremely bright regions
* deep shadows
* strong local contrast
* low-texture areas
* nonlinear illumination
* difficult feature visibility

CHANDRASŪTRA therefore provides preprocessing techniques designed to make structural information more usable for downstream matching.

---

## CLAHE

**Contrast Limited Adaptive Histogram Equalization**

CLAHE operates locally instead of applying one global histogram transformation.

Conceptually:

```text
Input
  │
  ├── Divide into local regions
  │
  ├── Compute local histograms
  │
  ├── Clip excessive contrast
  │
  └── Redistribute histogram
          │
          ▼
    Enhanced Image
```

This can improve local terrain structure without allowing a small region to dominate the entire image histogram.

---

## Homomorphic Filtering

Homomorphic filtering separates illumination-related variations from reflectance-related information.

Conceptually:

```text
Observed Image
      │
      ▼
log(I)
      │
      ▼
Frequency-domain decomposition
      │
      ├──────────────┐
      ▼              ▼
Illumination      Reflectance
      │              │
      └──────┬───────┘
             ▼
        Reconstruction
```

This is particularly useful when illumination variation interferes with local feature extraction.

---

# 🧩 Stage 3 — Feature Extraction & Matching

CHANDRASŪTRA does not depend on one matcher.

Instead, it provides multiple matching strategies.

```text
                    IMAGE A
                       │
        ┌──────────────┼──────────────┐
        │              │              │
       SIFT           LoFTR          RoMa
        │              │              │
        │              │              │
        └──────────────┼──────────────┘
                       │
                   LightGlue
                       │
                       ▼
              Candidate Matches
                       │
                       ▼
              Geometric Filtering
```

---

# 🔹 SIFT

**Scale-Invariant Feature Transform**

SIFT provides a classical baseline.

Pipeline:

```text
Image
 ↓
Scale-space construction
 ↓
Keypoint detection
 ↓
Orientation assignment
 ↓
Descriptor generation
 ↓
Descriptor matching
 ↓
Lowe ratio filtering
```

SIFT is valuable because it provides:

* interpretability
* CPU compatibility
* a classical baseline
* sparse correspondences
* a useful failure comparison against learned methods

Research:

David G. Lowe, *Distinctive Image Features from Scale-Invariant Keypoints*, International Journal of Computer Vision, 2004.

[Research paper — Springer](https://link.springer.com/article/10.1023/B:VISI.0000029664.99615.94)

---

# 🔹 LoFTR

**LoFTR — Detector-Free Local Feature Matching with Transformers**

LoFTR approaches matching differently from traditional keypoint pipelines.

Instead of first detecting sparse keypoints, LoFTR performs coarse-to-fine matching using transformer-based representations.

```text
Image A ─────┐
             │
             ▼
        Transformer
             │
             ▼
        Coarse Matches
             │
             ▼
        Fine Matching
             │
             ▼
        Dense Correspondence
```

This is useful for scenes where conventional sparse keypoint detection may produce too few reliable correspondences.

Research:

[LoFTR — CVPR 2021 Open Access](https://openaccess.thecvf.com/content/CVPR2021/html/Sun_LoFTR_Detector-Free_Local_Feature_Matching_With_Transformers_CVPR_2021_paper.html)

---

# 🔹 RoMa

**RoMa — Robust Dense Feature Matching**

RoMa is particularly relevant to CHANDRASŪTRA because it combines robust dense matching with pretrained visual representations.

The original RoMa research describes the use of pretrained DINOv2 features together with specialized fine features and a transformer-based matching decoder.

Conceptually:

```text
Image A                         Image B
   │                               │
   ▼                               ▼
DINOv2 features              DINOv2 features
   │                               │
   └──────────────┬────────────────┘
                  ▼
           Feature correlation
                  │
                  ▼
          Transformer decoder
                  │
                  ▼
       Dense correspondence field
                  │
                  ▼
          Coarse-to-fine result
```

RoMa is particularly interesting for difficult matching conditions where sparse local descriptors can become unreliable.

Research:

[RoMa — Robust Dense Feature Matching](https://arxiv.org/abs/2305.15404)

---

# 🔹 LightGlue

**LightGlue — Local Feature Matching at Light Speed**

LightGlue is a learned sparse feature matcher designed to adapt its computation to the difficulty of the image pair.

The ICCV 2023 paper describes adaptive inference, allowing easier pairs to terminate earlier while allocating more computation to difficult pairs.

Conceptually:

```text
Local Features
      │
      ▼
Feature Matching Transformer
      │
      ├── Easy pair
      │      ↓
      │   Early exit
      │
      └── Difficult pair
             ↓
        More computation
             ↓
        Refined matches
```

Research:

[LightGlue — ICCV 2023 Open Access](https://openaccess.thecvf.com/content/ICCV2023/html/Lindenberger_LightGlue_Local_Feature_Matching_at_Light_Speed_ICCV_2023_paper.html)

---

# 🧠 DINOv2 Feature Representation

DINOv2 provides self-supervised visual representations.

The research demonstrates that self-supervised training can produce general-purpose visual features across diverse image distributions and tasks.

In CHANDRASŪTRA, DINOv2-related representations are useful as part of the learned feature/matching ecosystem.

```text
                  Lunar Image
                       │
                       ▼
                  DINOv2
                       │
                       ▼
             Visual representation
                       │
             ┌─────────┴─────────┐
             ▼                   ▼
       Matching features   Cross-modal features
```

Research:

[DINOv2 — Learning Robust Visual Features without Supervision](https://arxiv.org/abs/2304.07193)

---

# 🌐 Stage 4 — Cross-Modal Alignment

This is one of the most important components of CHANDRASŪTRA.

The system is not limited to matching visually similar images.

The architecture includes a dedicated cross-modal alignment mechanism for heterogeneous lunar observations.

Example:

```text
OHRC ────────────────┐
                     │
TMC ─────────────────┤
                     │
IIRS ────────────────┼────► Shared Representation Space
                     │
LRO NAC ─────────────┤
                     │
Other imagery ───────┘
```

Different sensors can observe the same physical terrain while producing substantially different image distributions.

Therefore:

```text
Pixel similarity
       ≠
Physical correspondence
```

CHANDRASŪTRA introduces a learned projection space to make heterogeneous representations more comparable.

---

# 🧮 Cross-Modal Projection Head

The cross-modal component uses a lightweight projection architecture.

Conceptually:

```text
Feature A
   │
   ▼
Linear Layer
   │
   ▼
Non-Linearity
   │
   ▼
Linear Layer
   │
   ▼
Embedding A
   │
   ▼
L2 Normalization
```

The same conceptual process is applied to the other modality.

The result is a shared normalized representation space.

---

# 🔥 InfoNCE Contrastive Learning

The cross-modal representation can be trained using contrastive learning.

The objective is conceptually:

```text
Positive pair
      ↓
similar embeddings
      ↓
high similarity

Negative pairs
      ↓
different embeddings
      ↓
low similarity
```

A simplified InfoNCE objective can be represented as:

$$
\mathcal{L}
=
-\log
\frac{
\exp(sim(z_i,z_i^+)/\tau)
}{
\sum_j \exp(sim(z_i,z_j)/\tau)
}
$$

where:

* \(z_i\) = embedding of one observation
* \(z_i^+\) = corresponding positive observation
* \(z_j\) = candidate embeddings
* \(sim\) = similarity function
* \(\tau\) = temperature parameter

The embeddings are L2-normalized before similarity calculation.

---

# 📐 Stage 5 — Geometric Estimation

Feature matching alone is not enough.

A matcher can produce:

```text
Correct matches
+
Incorrect matches
```

Therefore CHANDRASŪTRA introduces geometric consistency.

---

## RANSAC Homography

The system estimates a homography using RANSAC.

Conceptually:

```text
Candidate matches
       │
       ▼
Random sample
       │
       ▼
Estimate transformation
       │
       ▼
Calculate reprojection error
       │
       ▼
Classify inliers / outliers
       │
       ▼
Repeat
       │
       ▼
Best geometric model
```

The implementation uses configurable parameters including:

* reprojection threshold
* confidence
* maximum iterations

The resulting model reports:

* inlier count
* inlier ratio
* mean reprojection error

---

# 📊 Constrained Affine Geometry

CHANDRASŪTRA also supports a constrained four-degree-of-freedom affine model.

Conceptually:

```text
Translation X
Translation Y
Rotation
Scale
```

This is useful when a full homography would introduce unnecessary degrees of freedom.

---

# 📏 Reprojection Error

For a correspondence:

$$
x_i \leftrightarrow x'_i
$$

and estimated transformation \(H\):

$$
\hat{x}'_i = Hx_i
$$

the reprojection error can be expressed as:

$$
e_i = \left\|x'_i-\hat{x}'_i\right\|
$$

The system can aggregate these errors to assess geometric consistency.

---

# 🎯 Stage 6 — Sub-Pixel Refinement

After coarse geometric registration, CHANDRASŪTRA performs refinement.

```text
Initial alignment
       │
       ▼
ECC refinement
       │
       ▼
Phase correlation
       │
       ▼
Pyramid refinement
       │
       ▼
Learned refinement
       │
       ▼
Final alignment
```

---

# 🔬 ECC Refinement

ECC stands for:

**Enhanced Correlation Coefficient**

ECC-based image alignment optimizes a correlation-based objective while being designed to handle photometric differences. The foundational ECC work was published in IEEE TPAMI in 2008.

Research:

[Parametric Image Alignment Using Enhanced Correlation Coefficient Maximization — IEEE](https://ieeexplore.ieee.org/document/4515873)

---

# ⚡ Phase Correlation

Phase correlation estimates translational displacement in the frequency domain.

Conceptually:

```text
Image A ──► FFT ──┐
                  │
                  ├── Cross-power spectrum
                  │
Image B ──► FFT ──┘
                  │
                  ▼
                 IFFT
                  │
                  ▼
           Translation peak
```

The implementation is configured with a high upsampling factor for sub-pixel estimation.

> The configured sampling grid should not be confused with guaranteed empirical accuracy. Actual registration accuracy depends on image texture, signal-to-noise ratio, illumination, interpolation and geometric assumptions.

---

# 🔬 Pyramid Refinement

A multi-scale refinement strategy can progressively move from:

```text
Coarse
  ↓
Medium
  ↓
Fine
  ↓
Sub-pixel
```

This helps reduce the risk of becoming trapped immediately in a difficult local optimum.

---

# 🤖 Learned Sub-Pixel Refinement

CHANDRASŪTRA also contains infrastructure for learned refinement.

This allows future models to learn residual corrections after classical registration.

Conceptually:

```text
Geometric estimate
       │
       ▼
Residual displacement
       │
       ▼
Learned model
       │
       ▼
Δx, Δy correction
       │
       ▼
Refined registration
```

---

# 🌡️ Stage 7 — Uncertainty Quantification

A registration system should not only answer:

> "Where is the match?"

It should also answer:

> "How confident are we?"

CHANDRASŪTRA therefore includes uncertainty estimation.

---

## Match Confidence

Low-confidence correspondences can be assigned higher uncertainty.

Conceptually:

```text
High confidence
      ↓
Low uncertainty

Low confidence
      ↓
High uncertainty
```

---

## Spatial Dispersion

The system also considers local displacement consistency.

If neighboring correspondences strongly agree:

```text
→ → → →
→ → → →
→ → → →
```

the region is geometrically stable.

If neighboring displacements disagree:

```text
→ ↑ ←
↓ → ↗
← ↘ ↑
```

the region is less reliable.

---

# 🗺️ Uncertainty Heatmap

The resulting uncertainty can be represented spatially:

```text
Lunar image
     │
     ▼
Match confidence
     +
Local displacement dispersion
     │
     ▼
Uncertainty field
     │
     ▼
Spatial heatmap
```

This is particularly useful for identifying:

* shadow boundaries
* low-texture terrain
* mismatched regions
* unstable geometric areas
* problematic sensor overlap

---

# 📈 Stage 8 — Scientific Evaluation

CHANDRASŪTRA does not rely exclusively on visual inspection.

The evaluation layer includes quantitative metrics such as:

* RMSE
* NCC
* SSIM
* Mutual Information

---

# 📉 RMSE

Root Mean Square Error:

$$
RMSE =
\sqrt{
\frac{1}{N}
\sum_{i=1}^{N}
(x_i-y_i)^2
}
$$

Lower values indicate smaller pixel-wise differences under the assumptions of the metric.

---

# 📊 NCC

Normalized Cross-Correlation measures normalized similarity between two image regions.

It can be useful for evaluating local alignment while reducing sensitivity to certain intensity-scale changes.

---

# 🖼️ SSIM

Structural Similarity Index evaluates structural similarity rather than only raw pixel differences.

Research:

[Image Quality Assessment: From Error Visibility to Structural Similarity — IEEE](https://ieeexplore.ieee.org/document/1284395)

---

# 🧠 Mutual Information

Mutual Information measures statistical dependence between image intensities.

This is especially interesting for cross-modal registration because two sensors may have different intensity distributions while still observing corresponding physical structures.

---

# 🧪 Evaluation Philosophy

A critical design principle is:

> **Metrics must come from actual computation.**

CHANDRASŪTRA is designed so that pipeline metrics are generated from the processing stages rather than being manually inserted into the interface.

Conceptually:

```text
Input
 ↓
Actual computation
 ↓
Actual matches
 ↓
Actual geometry
 ↓
Actual refinement
 ↓
Actual metrics
 ↓
SSE / API
 ↓
Frontend
```

Not:

```text
Input
 ↓
Hard-coded number
 ↓
UI
```

---

# 🔄 Complete Processing Pipeline

The complete pipeline can therefore be represented as:

```text
                    ┌──────────────┐
                    │ Lunar Images │
                    └──────┬───────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │    INGESTION    │
                  │                 │
                  │ OpenCV / PIL    │
                  │ SHA-256         │
                  │ Size validation │
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │ PREPROCESSING   │
                  │                 │
                  │ CLAHE           │
                  │ Homomorphic     │
                  └────────┬────────┘
                           │
                           ▼
        ┌────────────────────────────────────┐
        │         FEATURE MATCHING           │
        │                                    │
        │ SIFT ─ LoFTR ─ RoMa ─ LightGlue   │
        └─────────────────┬──────────────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │ CROSS-MODAL     │
                 │ ALIGNMENT       │
                 │                 │
                 │ Projection Head │
                 │ InfoNCE         │
                 └────────┬────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │ GEOMETRY        │
                 │                 │
                 │ RANSAC          │
                 │ Homography      │
                 │ Affine          │
                 └────────┬────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │ REFINEMENT      │
                 │                 │
                 │ ECC             │
                 │ Phase Corr.     │
                 │ Pyramid         │
                 │ Learned         │
                 └────────┬────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │ UNCERTAINTY     │
                 │                 │
                 │ Confidence      │
                 │ Dispersion      │
                 │ Heatmap         │
                 └────────┬────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │ EVALUATION      │
                 │                 │
                 │ RMSE            │
                 │ NCC             │
                 │ SSIM            │
                 │ Mutual Info     │
                 └────────┬────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │ FINAL RESULT    │
                 └─────────────────┘
```

---

# ⚙️ Pipeline Orchestration

The backend contains an orchestration layer that coordinates the complete workflow.

The logical processing stages are:

```text
INGESTION
    ↓
PREPROCESSING
    ↓
FEATURE EXTRACTION / MATCHING
    ↓
GEOMETRIC ESTIMATION
    ↓
SUB-PIXEL REFINEMENT
    ↓
EVALUATION
    ↓
COMPLETE
```

The pipeline exposes typed progress events through **Server-Sent Events (SSE)**.

This allows the frontend to represent actual processing progress.

Example:

```text
JOB CREATED
     ↓
INGESTION
     ↓
PREPROCESSING
     ↓
MATCHING
     ↓
GEOMETRY
     ↓
REFINEMENT
     ↓
EVALUATION
     ↓
COMPLETE
```

---

# 📡 Real-Time Progress Architecture

```text
                    Backend
                       │
                       │
                Pipeline Engine
                       │
                       ▼
                Stage completed
                       │
                       ▼
                  SSE event
                       │
                       ▼
                 API endpoint
                       │
                       ▼
                  Frontend
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
     Progress UI              Scientific metrics
```

This prevents the frontend from being a disconnected visualization layer.

---

# 🗄️ Backend Architecture

The backend is organized around asynchronous scientific processing.

```text
Client
  │
  ▼
FastAPI
  │
  ├── API
  │
  ├── Job Management
  │
  ├── SSE Progress
  │
  └── Validation
       │
       ▼
  Pipeline Orchestrator
       │
       ├── Ingestion
       ├── Preprocessing
       ├── Matching
       ├── Geometry
       ├── Refinement
       └── Evaluation
       │
       ▼
 SQLAlchemy / Database
```

---

# 🧮 Database / Persistence Layer

The backend uses SQLAlchemy for application-level persistence and provides Docker-based Supabase/PostgreSQL infrastructure.

The persistence layer can be used for:

* processing jobs
* job state
* metadata
* pipeline results
* model information
* evaluation information

---

# 🤖 MLOps Architecture

Machine learning is treated as an actual engineering lifecycle rather than a collection of model files.

```text
Training
   │
   ▼
Validation
   │
   ▼
Evaluation
   │
   ▼
Model Registry
   │
   ├── Development
   │
   ├── Staging
   │
   └── Production
```

A model should pass an evaluation gate before being promoted toward production usage.

---

# 🧠 Training Architecture

The training system uses a real PyTorch training loop.

Conceptually:

```text
Dataset
   │
   ▼
Train / Validation Split
   │
   ├───────────────┐
   ▼               ▼
Training         Validation
   │
   ▼
Forward pass
   │
   ▼
InfoNCE loss
   │
   ▼
Backpropagation
   │
   ▼
Optimizer step
   │
   ▼
Evaluation
```

The current split architecture uses an approximately:

```text
80% Training
20% Validation
```

partition.

---

# 🏷️ Model Registry

Models progress through controlled lifecycle states:

```text
DEVELOPMENT
     │
     ▼
  EVALUATION
     │
     ▼
  STAGING
     │
     ▼
  PRODUCTION
```

This makes it possible to distinguish:

* experimental checkpoints
* validated models
* deployment candidates
* production models

---

# ☀️ Photometric Relighting

CHANDRASŪTRA also contains a photometric processing layer.

The objective is to model how lunar terrain appearance changes under illumination.

Inputs can include:

```text
DEM
 │
 ├── Elevation
 ├── Gradient X
 └── Gradient Y
          │
          ▼
Surface geometry
          │
          +
Sun vector
          │
          ▼
Illumination model
          │
          ▼
Relit terrain
```

The implementation includes physically motivated approaches involving:

* surface gradients
* dynamic sun vectors
* Lambertian-style reflectance
* Hapke-inspired reflectance modelling

This is important because illumination is not merely a visual nuisance.

It is physically related to:

* terrain orientation
* Sun position
* incidence angle
* local surface geometry

---

# 🗺️ DEM & Elevation Analysis

The frontend includes functionality around terrain/elevation analysis.

Conceptually:

```text
DEM
 │
 ├── Elevation map
 │
 ├── Gradient
 │
 ├── Terrain profile
 │
 └── Surface interpretation
```

This enables the system to connect image registration with terrain geometry.

---

# 🛰️ Mission Analysis Interface

The frontend is not simply a generic dashboard.

It is structured around lunar mission analysis.

Major interface concepts include:

### Orbital Registration

Compare and register observations.

### Photometric Laboratory

Explore illumination and photometric effects.

### DEM Synthesis

Generate or inspect terrain representations.

### Elevation Profiles

Study terrain variation along selected paths.

### Telemetry Archive

Organize mission/observation telemetry information.

### Rover Simulation

Provide an interactive surface exploration/simulation layer.

### IIRS Spectral Analysis

Provide an interface for spectral observations and analysis.

---

# 🖥️ Frontend Architecture

```text
Next.js
   │
   ▼
React
   │
   ├── Mission UI
   ├── Registration UI
   ├── Photometric Lab
   ├── DEM Tools
   ├── Elevation Tools
   ├── Telemetry
   ├── Rover Simulation
   └── Spectral Analysis
          │
          ▼
       API Layer
          │
          ▼
      FastAPI Backend
```

---

# 🔌 API Communication

The frontend communicates with the backend through HTTP APIs and real-time SSE streams.

```text
Frontend
   │
   ├──────── HTTP ────────► REST/API
   │
   │
   └──────── SSE ─────────► Pipeline progress
                                │
                                ▼
                         Processing stages
```

---

# 📡 Why SSE?

Long-running scientific processing should not require the user to repeatedly refresh the page.

Instead:

```text
POST /job
     │
     ▼
Job ID
     │
     ▼
SSE connection
     │
     ├── ingestion
     ├── preprocessing
     ├── matching
     ├── geometry
     ├── refinement
     ├── evaluation
     └── complete
```

The interface can therefore remain synchronized with actual backend computation.

---

# 🔐 Provenance & Integrity

Scientific software needs reproducibility.

CHANDRASŪTRA therefore incorporates several provenance mechanisms.

### Input hashing

```text
Input
 ↓
SHA-256
 ↓
Content identity
```

### Pipeline state

```text
Job
 ↓
Stages
 ↓
Results
```

### Model lifecycle

```text
Model
 ↓
Version
 ↓
Evaluation
 ↓
Registry state
```

### Computed metrics

```text
Pipeline computation
        ↓
Metric generation
        ↓
API
        ↓
Frontend
```

---

# 🧪 Testing Philosophy

Testing is organized around the scientific pipeline rather than only the web application.

Important testing targets include:

```text
Ingestion
   ↓
Preprocessing
   ↓
Matching
   ↓
Geometry
   ↓
Refinement
   ↓
Evaluation
```

Tests should validate:

* valid images
* invalid inputs
* dimension constraints
* matcher outputs
* geometric degeneracy
* insufficient matches
* refinement failures
* metric computation
* model lifecycle
* API behavior

---

# ⚠️ Failure Handling

A scientific pipeline must fail explicitly when an operation cannot be performed reliably.

Examples:

```text
Insufficient matches
        ↓
Geometric estimation cannot proceed
        ↓
Typed pipeline error
```

rather than:

```text
Insufficient matches
        ↓
Fake successful result
```

Similarly:

```text
Metric computation failure
        ↓
Reported failure
```

rather than:

```text
Metric computation failure
        ↓
Invented metric
```

---

# 🧱 Technology Stack

## Backend

* Python
* FastAPI
* SQLAlchemy
* PyTorch
* OpenCV
* PIL
* NumPy
* SciPy
* scikit-image
* Kornia
* Pydantic
* Uvicorn
* PostgreSQL / Supabase infrastructure

## Machine Learning

* PyTorch
* DINOv2
* LoFTR
* RoMa
* LightGlue
* SIFT
* contrastive learning
* InfoNCE
* learned refinement

## Frontend

* Next.js
* React
* TypeScript
* Tailwind CSS
* Prisma
* interactive scientific visualization components

---

# 📁 Important Backend Modules

| Module           | Purpose                               |
| ---------------- | ------------------------------------- |
| `ingestion/`     | Image loading, validation and hashing |
| `preprocessing/` | Image enhancement and normalization   |
| `matching/`      | Feature extraction and correspondence |
| `geometry/`      | Geometric transformation estimation   |
| `refinement/`    | Sub-pixel registration                |
| `evaluation/`    | Scientific registration metrics       |
| `pipelines/`     | End-to-end orchestration              |
| `mlops/`         | Training and model lifecycle          |
| `core/`          | Shared application infrastructure     |
| `api/`           | Backend API interfaces                |

---

# 🧩 Important Components

Some of the principal scientific components include:

```text
cross_modal.py
    ↓
Cross-modal representation alignment

orchestrator.py
    ↓
End-to-end pipeline control

loader.py
    ↓
Image ingestion + SHA-256

normalizer.py
    ↓
CLAHE + homomorphic preprocessing

estimator.py
    ↓
Homography + affine estimation

uncertainty.py
    ↓
Spatial uncertainty estimation

metrics.py
    ↓
RMSE / NCC / SSIM / MI

model_registry
    ↓
ML model lifecycle

photometric pipeline
    ↓
Terrain illumination modelling
```

---

# 🚀 Getting Started

## 1. Clone the repository

```bash
git clone https://github.com/Ayushcodes-hub/Lunaris-2.git
cd Lunaris-2
```

> The repository URL currently uses the existing GitHub repository slug.
> **The project itself is named CHANDRASŪTRA.**

---

# 🐍 Backend Setup

Enter the backend:

```bash
cd Backend
```

Create a virtual environment:

```bash
python -m venv .venv
```

Activate it on Windows:

```cmd
.venv\Scripts\activate
```

Upgrade pip:

```cmd
python -m pip install --upgrade pip
```

Install dependencies:

```cmd
pip install -r requirements.txt
```

---

# 🔑 Environment Configuration

Create a local environment file from the provided template:

```cmd
copy .env.example .env
```

Then configure the required values in:

```text
Backend/.env
```

Never commit secrets.

The repository's ignore rules are designed to prevent environment secrets from entering version control.

---

# ▶️ Running the Backend

From the `Backend` directory:

```cmd
python run.py
```

Alternatively, where applicable:

```cmd
uvicorn backend.app.main:app --reload
```

The exact command should follow the project's current `README-RUN.md` and runtime configuration.

---

# 🗄️ Database Infrastructure

The repository contains Docker configuration for Supabase/PostgreSQL infrastructure.

Example:

```cmd
docker compose -f docker-compose.supabase.yml up -d
```

Check container status:

```cmd
docker ps
```

---

# 🌐 Frontend Setup

Open a second terminal.

```cmd
cd Frontend
```

Install JavaScript dependencies according to the package manager used by the project.

For npm:

```cmd
npm install
```

For Bun:

```cmd
bun install
```

Run the development server:

```cmd
npm run dev
```

or:

```cmd
bun run dev
```

The application can then be accessed through the local development URL displayed by Next.js.

---

# 🧭 Recommended Development Flow

```text
1. Start database
       ↓
2. Start backend
       ↓
3. Verify API
       ↓
4. Start frontend
       ↓
5. Open mission interface
       ↓
6. Submit registration job
       ↓
7. Monitor SSE progress
       ↓
8. Inspect matches
       ↓
9. Inspect geometry
       ↓
10. Inspect uncertainty
       ↓
11. Inspect scientific metrics
```

---

# 📚 Research Foundations

CHANDRASŪTRA builds upon established research in computer vision, image registration, feature matching, self-supervised learning and scientific image analysis.

## 1. SIFT

**David G. Lowe**

*Distinctive Image Features from Scale-Invariant Keypoints*

International Journal of Computer Vision, 2004.

[Springer Research Paper](https://link.springer.com/article/10.1023/B:VISI.0000029664.99615.94)

---

## 2. LoFTR

**Jiantao Sun et al.**

*LoFTR: Detector-Free Local Feature Matching with Transformers*

CVPR 2021.

[CVPR Open Access Paper](https://openaccess.thecvf.com/content/CVPR2021/html/Sun_LoFTR_Detector-Free_Local_Feature_Matching_With_Transformers_CVPR_2021_paper.html)

---

## 3. RoMa

**Johan Edstedt et al.**

*RoMa: Robust Dense Feature Matching*

2023.

[arXiv Paper](https://arxiv.org/abs/2305.15404)

RoMa is especially relevant to the architecture because its published approach combines pretrained DINOv2 representations with specialized fine features and a transformer matching mechanism.

---

## 4. DINOv2

**Maxime Oquab et al.**

*DINOv2: Learning Robust Visual Features without Supervision*

2023.

[arXiv Paper](https://arxiv.org/abs/2304.07193)

DINOv2 investigates large-scale self-supervised visual representation learning and general-purpose visual features.

---

## 5. LightGlue

**Philipp Lindenberger, Paul-Edouard Sarlin, Marc Pollefeys**

*LightGlue: Local Feature Matching at Light Speed*

ICCV 2023.

[ICCV Open Access Paper](https://openaccess.thecvf.com/content/ICCV2023/html/Lindenberger_LightGlue_Local_Feature_Matching_at_Light_Speed_ICCV_2023_paper.html)

LightGlue's adaptive computation strategy is particularly relevant when balancing matching robustness and computational cost.

---

## 6. ECC Image Alignment

**G. D. Evangelidis and E. Z. Psarakis**

*Parametric Image Alignment Using Enhanced Correlation Coefficient Maximization*

IEEE Transactions on Pattern Analysis and Machine Intelligence, 2008.

[IEEE Xplore](https://ieeexplore.ieee.org/document/4515873)

ECC is relevant to the refinement layer because the method formulates image alignment around an enhanced correlation objective designed to tolerate photometric distortions.

---

## 7. SSIM

**Zhou Wang et al.**

*Image Quality Assessment: From Error Visibility to Structural Similarity*

IEEE Transactions on Image Processing, 2004.

[IEEE Xplore](https://ieeexplore.ieee.org/document/1284395)

---

## 8. RANSAC

**Martin A. Fischler and Robert C. Bolles**

*Random Sample Consensus: A Paradigm for Model Fitting with Applications to Image Analysis and Automated Cartography*

Communications of the ACM, 1981.

[ACM Digital Library](https://dl.acm.org/doi/10.1145/358669.358692)

---

# 🛰️ Lunar Mission / Data References

CHANDRASŪTRA is designed around the broader ecosystem of lunar remote sensing.

Useful mission/data references include:

### NASA Lunar Reconnaissance Orbiter

[NASA LRO Mission](https://lunar.gsfc.nasa.gov/)

### Lunar Reconnaissance Orbiter Camera

[LROC — Lunar Reconnaissance Orbiter Camera](https://lroc.im-ldi.com/)

### ISRO

[Indian Space Research Organisation](https://www.isro.gov.in/)

### Chandrayaan-2

[ISRO Chandrayaan-2 Mission](https://www.isro.gov.in/Chandrayaan_2.html)

---

# 🧪 Why Multi-Modal Registration Matters

Consider a lunar crater observed by different instruments:

```text
             SAME PHYSICAL TERRAIN
                     │
       ┌─────────────┼─────────────┐
       │             │             │
       ▼             ▼             ▼
      OHRC          TMC           NAC
       │             │             │
       ▼             ▼             ▼
   Panchromatic   Different      High-res
     imagery     observation    reference
       │             │             │
       └─────────────┼─────────────┘
                     ▼
             CHANDRASŪTRA
                     │
                     ▼
          Common spatial framework
```

Once observations can be registered, they can potentially be used together for:

* terrain interpretation
* geological analysis
* cross-mission comparison
* change analysis
* spectral/spatial correlation
* landing-site analysis
* rover planning
* DEM-assisted interpretation
* scientific visualization

---

# 🌑 Lunar-Specific Challenges

CHANDRASŪTRA is motivated by challenges that are especially important in lunar imagery.

## Extreme illumination

The Moon has no atmosphere capable of providing Earth-like diffuse illumination.

Therefore terrain can exhibit dramatic shadow boundaries.

---

## Lack of familiar visual context

Many lunar regions contain:

* repetitive textures
* smooth plains
* crater interiors
* low-texture surfaces
* ambiguous local structures

This can make classical feature matching difficult.

---

## Cross-sensor appearance

Two sensors can encode the same physical surface differently.

Therefore:

```text
Same terrain
    ≠
Same pixel appearance
```

---

## Scale differences

Different instruments may observe the same region at substantially different spatial resolutions.

---

## Viewing geometry

Different acquisition geometries alter:

* apparent feature shapes
* shadow positions
* local contrast
* visible terrain structures

---

# 🧠 Why Multiple Matchers?

No single matcher is guaranteed to work best on every image pair.

Therefore CHANDRASŪTRA provides a heterogeneous matching toolkit.

| Matcher          | Character                 | Main Role                   |
| ---------------- | ------------------------- | --------------------------- |
| SIFT             | Classical sparse          | Baseline                    |
| LoFTR            | Learned dense             | Difficult correspondence    |
| RoMa             | Learned dense             | Robust dense matching       |
| LightGlue        | Learned sparse            | Efficient adaptive matching |
| DINOv2           | Foundation representation | Learned visual features     |
| Cross-modal head | Learned projection        | Heterogeneous modalities    |

This makes the system suitable for experimentation and comparative evaluation.

---

# 📊 Scientific Result Model

A registration result should not simply be:

```text
SUCCESS
```

Instead, a meaningful result can contain:

```text
Registration Result
│
├── Input metadata
│
├── Feature matcher
│
├── Number of candidate matches
│
├── Number of inliers
│
├── Inlier ratio
│
├── Transformation model
│
├── Reprojection error
│
├── Refinement displacement
│
├── Uncertainty
│
├── RMSE
│
├── NCC
│
├── SSIM
│
└── Mutual Information
```

This creates a more scientifically useful output.

---

# 📐 Conceptual Mathematical Model

Let:

$$
I_A
$$

be an observation from sensor A and:

$$
I_B
$$

be an observation from sensor B.

The objective is to estimate a transformation:

$$
T
$$

such that:

$$
T(I_A) \approx I_B
$$

under a suitable representation and registration objective.

The complete system can be viewed as:

$$
I_A,I_B
\rightarrow
P(I_A),P(I_B)
\rightarrow
F(I_A),F(I_B)
\rightarrow
M
\rightarrow
G
\rightarrow
R
\rightarrow
E
$$

where:

* \(P\) = preprocessing
* \(F\) = feature representation
* \(M\) = matching
* \(G\) = geometric estimation
* \(R\) = refinement
* \(E\) = evaluation

The final system therefore separates:

```text
Representation
      ↓
Correspondence
      ↓
Geometry
      ↓
Optimization
      ↓
Validation
```

---

# 🧬 Architecture Principles

## 1. Modular scientific components

Each stage has a defined responsibility.

## 2. Multiple algorithmic paths

Classical and learned approaches coexist.

## 3. Quantitative validation

Visual results should be accompanied by measurable metrics.

## 4. Provenance

Inputs and model artifacts should remain traceable.

## 5. Explicit failure

A failed computation should be represented as a failure rather than silently replaced.

## 6. Reproducibility

Configurations, model versions and input identities should be recoverable.

## 7. Extensibility

New matchers, refiners and evaluation metrics can be added without redesigning the complete system.

---

# 🔌 Extending CHANDRASŪTRA

The architecture is intended to support future additions.

Possible future matchers:

```text
SuperPoint
SuperGlue
DISK
GlueStick
LoFTR variants
RoMa variants
Future dense matchers
```

Possible future geometry:

```text
Fundamental matrix
Essential matrix
Piecewise transformation
DEM-aware registration
Orthorectification
Photogrammetric bundle adjustment
```

Possible future uncertainty:

```text
Bayesian correspondence models
Learned uncertainty
Monte Carlo registration
Ensemble-based confidence
```

Possible future planetary modelling:

```text
SPICE geometry
Camera models
Orbital state propagation
Illumination modelling
Terrain ray tracing
Orthographic projection
Map projection
```

---

# 🚀 Future Research Directions

CHANDRASŪTRA can evolve toward a broader lunar geospatial research platform.

## 1. DEM-aware registration

Instead of assuming a flat image plane:

```text
Image
  +
DEM
  +
Camera geometry
  +
Orbital state
      ↓
3D-aware registration
```

---

## 2. Orbital geometry integration

Integrating spacecraft position and attitude could enable physically constrained registration.

---

## 3. Spectral-spatial fusion

IIRS observations could be integrated with high-resolution imaging.

```text
Spatial resolution
       +
Spectral information
       ↓
Multi-dimensional lunar representation
```

---

## 4. Temporal registration

Repeated observations could enable temporal analysis.

```text
Observation T1
      ↓
Registration
      ↓
Observation T2
      ↓
Difference analysis
```

---

## 5. Autonomous landing-site analysis

The architecture could eventually support:

* terrain hazard analysis
* crater identification
* slope estimation
* surface texture analysis
* illumination assessment
* candidate-region comparison

---

# 🧭 Scientific Workflow Example

A representative CHANDRASŪTRA experiment can be:

```text
1. Select lunar observation A
        ↓
2. Select corresponding observation B
        ↓
3. Compute image hashes
        ↓
4. Validate image dimensions
        ↓
5. Apply preprocessing
        ↓
6. Extract features
        ↓
7. Generate candidate correspondences
        ↓
8. Apply cross-modal representation
        ↓
9. Estimate geometric transformation
        ↓
10. Reject geometric outliers
        ↓
11. Refine registration
        ↓
12. Generate uncertainty
        ↓
13. Calculate evaluation metrics
        ↓
14. Visualize final registration
        ↓
15. Store scientific result
```

---

# 📦 Reproducibility Checklist

Before considering an experiment complete:

```text
[ ] Input images identified
[ ] Input hashes recorded
[ ] Sensor information recorded
[ ] Preprocessing configuration recorded
[ ] Matcher recorded
[ ] Model version recorded
[ ] Geometry model recorded
[ ] Refinement method recorded
[ ] Evaluation metrics recorded
[ ] Uncertainty calculated
[ ] Result stored
```

---

# 🛡️ Security & Operational Considerations

CHANDRASŪTRA is designed to avoid committing secrets to the repository.

Sensitive configuration should remain in:

```text
.env
```

rather than:

```text
Git repository
```

Model and data provenance should also be kept separate from application secrets.

---

# 📴 Local / Offline Operation

The scientific processing architecture is designed to support local execution once the required:

* Python dependencies
* JavaScript dependencies
* model weights
* datasets
* database services

have been provisioned.

This is useful for research environments where data should remain local.

Offline capability should be understood as an operational configuration rather than assuming that every external model or dependency can be downloaded without an initial provisioning step.

---

# 📜 Research Integrity

CHANDRASŪTRA is a research and engineering platform.

It is **not an official ISRO software product**, nor should results generated by the system be interpreted as official mission products unless independently validated and formally authorized.

The purpose of the platform is to provide an engineering framework for:

* experimentation
* registration research
* algorithm comparison
* visualization
* scientific evaluation
* multi-modal lunar analysis

---

# 🧑‍🔬 Scientific Interpretation

A successful numerical registration does not automatically imply scientific truth.

For example:

```text
Low RMSE
    ≠
Correct geological interpretation
```

Similarly:

```text
High inlier ratio
    ≠
Guaranteed physical correspondence
```

Scientific interpretation should consider:

* sensor characteristics
* acquisition geometry
* illumination
* terrain
* registration model
* uncertainty
* data quality
* independent validation

---

# 🧪 Benchmarking Philosophy

A future benchmark suite should evaluate:

### Classical baseline

```text
SIFT + RANSAC
```

### Dense learned matching

```text
LoFTR + geometry
```

### Robust dense matching

```text
RoMa + geometry
```

### Adaptive sparse matching

```text
LightGlue + geometry
```

### Cross-modal system

```text
Cross-modal representation
+
Matcher
+
Geometry
+
Refinement
```

The benchmark can then compare:

```text
Match count
Inlier ratio
Reprojection error
RMSE
NCC
SSIM
Mutual Information
Runtime
Memory
Failure rate
Uncertainty
```

---

# 📊 Suggested Experiment Matrix

| Experiment       | Sensor A | Sensor B | Matcher     | Geometry | Refinement        |
| ---------------- | -------- | -------- | ----------- | -------- | ----------------- |
| Baseline         | OHRC     | NAC      | SIFT        | RANSAC   | ECC               |
| Dense            | OHRC     | NAC      | LoFTR       | RANSAC   | ECC               |
| Robust Dense     | OHRC     | NAC      | RoMa        | RANSAC   | Pyramid           |
| Sparse Learned   | OHRC     | NAC      | LightGlue   | RANSAC   | Phase Correlation |
| Cross-Modal      | TMC      | NAC      | Cross-Modal | Affine   | Learned           |
| Spectral-Spatial | IIRS     | NAC      | Cross-Modal | RANSAC   | ECC               |

---

# 🏆 What Makes the Architecture Different

The central architectural idea is not simply:

> "Use AI to match two lunar images."

It is:

> **Build a complete chain of evidence from raw lunar observations to a quantitatively evaluated, uncertainty-aware registration result.**

That chain is:

```text
DATA
 ↓
PROVENANCE
 ↓
PREPROCESSING
 ↓
REPRESENTATION
 ↓
CORRESPONDENCE
 ↓
CROSS-MODAL ALIGNMENT
 ↓
GEOMETRIC CONSISTENCY
 ↓
SUB-PIXEL OPTIMIZATION
 ↓
UNCERTAINTY
 ↓
SCIENTIFIC EVALUATION
 ↓
RESULT
```

---

# 🌌 Project Vision

CHANDRASŪTRA is intended to grow toward a unified computational environment where heterogeneous lunar observations can be studied together rather than as isolated datasets.

The long-term architecture can evolve from:

```text
Image Registration
```

toward:

```text
                    CHANDRASŪTRA
                          │
          ┌───────────────┼────────────────┐
          │               │                │
          ▼               ▼                ▼
     Registration     Terrain Model     Spectral Data
          │               │                │
          └───────────────┼────────────────┘
                          ▼
                  Lunar Data Fusion
                          │
                          ▼
                Scientific Analysis
                          │
                          ▼
                 Mission Intelligence
```

---

# 🛰️ Project Status

CHANDRASŪTRA currently contains infrastructure spanning:

* multi-modal lunar image ingestion
* image preprocessing
* classical feature matching
* learned feature matching
* cross-modal representation alignment
* geometric estimation
* sub-pixel refinement
* uncertainty estimation
* scientific evaluation
* photometric processing
* model training
* model registry
* asynchronous backend orchestration
* database persistence
* real-time pipeline progress
* interactive lunar mission frontend

---

# 📚 Documentation

Backend execution instructions:

```text
Backend/README-RUN.md
```

Frontend execution instructions:

```text
Frontend/README-RUN.md
```

Model information:

```text
Backend/MODEL_CARD.md
```

Original project documentation:

```text
Backend/README_ORIGINAL.md
```

---

# 🔗 Research & Technical References

### Feature Matching

* [SIFT — Lowe, 2004](https://link.springer.com/article/10.1023/B:VISI.0000029664.99615.94)
* [LoFTR — CVPR 2021](https://openaccess.thecvf.com/content/CVPR2021/html/Sun_LoFTR_Detector-Free_Local_Feature_Matching_With_Transformers_CVPR_2021_paper.html)
* [RoMa — Robust Dense Feature Matching](https://arxiv.org/abs/2305.15404)
* [LightGlue — ICCV 2023](https://openaccess.thecvf.com/content/ICCV2023/html/Lindenberger_LightGlue_Local_Feature_Matching_at_Light_Speed_ICCV_2023_paper.html)
* [DINOv2 — Robust Visual Features](https://arxiv.org/abs/2304.07193)

### Image Registration

* [ECC — Enhanced Correlation Coefficient](https://ieeexplore.ieee.org/document/4515873)
* [SSIM — Structural Similarity](https://ieeexplore.ieee.org/document/1284395)
* [RANSAC — Fischler & Bolles](https://dl.acm.org/doi/10.1145/358669.358692)

### Lunar Missions

* [NASA Lunar Reconnaissance Orbiter](https://lunar.gsfc.nasa.gov/)
* [Lunar Reconnaissance Orbiter Camera](https://lroc.im-ldi.com/)
* [ISRO](https://www.isro.gov.in/)
* [Chandrayaan-2](https://www.isro.gov.in/Chandrayaan_2.html)

---

# 🧾 Citation

If CHANDRASŪTRA is used in research, demonstrations or derived work, cite the project repository and the underlying research methods used by the experiment.

Example:

```bibtex
@software{chandrasutra,
  title        = {CHANDRASŪTRA},
  author       = {Ayush Aryaman},
  year         = {2026},
  description  = {Multi-Modal Lunar Image Registration,
                  Cross-Sensor Alignment and Mission Analysis Platform},
  repository   = {Ayushcodes-hub/Lunaris-2}
}
```

When publishing scientific results, the original papers for the algorithms used should also be cited.

---

# ⚖️ Disclaimer

CHANDRASŪTRA is an independent research and engineering project.

It is not an official software product of:

* ISRO
* NASA
* ESA
* JAXA
* any individual lunar mission
* any instrument team

Mission names, instrument names and datasets remain the property and responsibility of their respective organizations and teams.

Results generated by CHANDRASŪTRA should be independently validated before being used for scientific conclusions or operational decisions.

---

# 🌙 CHANDRASŪTRA

> **From pixels to planetary understanding.**

```text
Observe.
      ↓
Align.
      ↓
Refine.
      ↓
Measure.
      ↓
Understand.
```

**CHANDRASŪTRA** brings heterogeneous lunar observations into a common computational framework—combining computer vision, machine learning, geometric registration, photometric modelling, uncertainty estimation and scientific evaluation into one extensible platform.

---

## Repository

**Project:** CHANDRASŪTRA

**Repository:** `Ayushcodes-hub/Lunaris-2`

**Primary focus:** Lunar multi-modal image registration and mission analysis

**Domain:** Planetary Science · Computer Vision · Remote Sensing · AI/ML · Lunar Exploration
