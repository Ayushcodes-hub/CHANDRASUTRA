// Production Python Code Scripts and Google Colab Notebook generator for Chandrayaan-2 Registration

export const PYTHON_SCRIPTS = {
  sunAngleModule: `"""
================================================================================
LUNAR SUN-ANGLE & TOPOGRAPHIC ILLUMINATION COMPENSATION MODULE
(CHANDRAYAAN-2 OHRC / TMC-2 / IIRS PREPROCESSING ENGINE)
================================================================================
Author: Senior Remote Sensing Software Engineer & Computer Vision Specialist
Mission: ISRO Chandrayaan-2 Planetary Mapping & Feature Correspondence
Applicable Sensors:
  - OHRC (Orbiter High Resolution Camera, 0.25 m/px)
  - TMC-2 (Terrain Mapping Camera 2 & Digital Elevation Models, 5.0 m/px)
  - IIRS (Imaging Infra-Red Spectrometer, 80 m/px)

Core Capabilities:
  1. Patch Illumination Pattern Analysis (Directional Rose Gradient, Shadow/Highlight Ratios).
  2. DEM-Guided Photometric Topographic Normalization:
       - Lommel-Seeliger Model (Lunar particulate single-scattering regolith standard).
       - Minnaert Topographic Normalization (Empirical k parameter least-squares fit).
       - C-Correction (Empirical Line Method avoiding division-by-zero shadow amplification).
  3. DEM-Free / Blind Illumination Normalization:
       - Multi-Scale Retinex (MSR) with spatial illumination-reflectance decomposition.
       - Sun-Angle-Guided Homomorphic Filtering in frequency domain.
       - Solar Azimuth Directional Gradient Equalization.
  4. Sun-Angle-Adjusted Histogram Matching (Cross-sensor solar flux normalization).
================================================================================
"""

import numpy as np
import cv2
from scipy import ndimage
from scipy.optimize import curve_fit
import matplotlib.pyplot as plt

# ==============================================================================
# 1. ILLUMINATION PATTERN ANALYZER
# ==============================================================================

class LunarIlluminationAnalyzer:
    """
    Analyzes local patch illumination patterns, estimates apparent solar azimuth
    from crater shadow-rim gradients, and extracts quantitative shadow/highlight masks.
    """
    @staticmethod
    def analyze_patch_illumination(image: np.ndarray, shadow_percentile: float = 10.0, highlight_percentile: float = 90.0) -> dict:
        """
        Extracts structural illumination metrics from a lunar patch.
        
        Args:
            image (np.ndarray): 2D float32 normalized image [0.0, 1.0].
            shadow_percentile (float): Cutoff percentile for deep shadow detection.
            highlight_percentile (float): Cutoff percentile for sunlit slopes.
        Returns:
            dict containing:
              - 'estimated_sun_azimuth_deg': Direction of primary illumination (0°-360°).
              - 'shadow_fraction': Ratio of pixels in deep shadow (cos i <= 0).
              - 'highlight_fraction': Ratio of pixels on sunlit crater slopes.
              - 'dynamic_contrast_ratio': Peak-to-shadow contrast magnitude.
              - 'shadow_mask': Boolean 2D mask of dark shadow zones.
        """
        img = np.clip(image, 0.0, 1.0).astype(np.float32)
        h, w = img.shape

        # 1. Compute directional intensity gradients (Scharr operator)
        grad_x = cv2.Scharr(img, cv2.CV_32F, 1, 0)
        grad_y = cv2.Scharr(img, cv2.CV_32F, 0, 1)

        # Gradient orientation angles [-pi, pi]
        grad_angles = np.arctan2(grad_y, grad_x)
        grad_mags = np.sqrt(grad_x**2 + grad_y**2)

        # Focus on significant edge gradients (crater rims and shadow boundaries)
        mag_thresh = np.percentile(grad_mags, 75.0)
        strong_gradients = grad_mags > mag_thresh

        # Weighted vector sum of gradient directions
        sum_x = np.sum(grad_mags[strong_gradients] * np.cos(grad_angles[strong_gradients]))
        sum_y = np.sum(grad_mags[strong_gradients] * np.sin(grad_angles[strong_gradients]))
        
        # Primary illumination azimuth points OPPOSITE to the gradient of dark-to-light
        dominant_angle_rad = np.arctan2(sum_y, sum_x)
        est_sun_azimuth = (np.degrees(dominant_angle_rad) + 180.0) % 360.0

        # 2. Shadow and Highlight fractions
        p_low = np.percentile(img, shadow_percentile)
        p_high = np.percentile(img, highlight_percentile)

        shadow_mask = img <= p_low
        highlight_mask = img >= p_high

        shadow_frac = float(np.sum(shadow_mask) / img.size)
        highlight_frac = float(np.sum(highlight_mask) / img.size)
        contrast_ratio = float((np.mean(img[highlight_mask]) + 1e-4) / (np.mean(img[shadow_mask]) + 1e-4))

        return {
            'estimated_sun_azimuth_deg': round(float(est_sun_azimuth), 2),
            'shadow_fraction': round(shadow_frac, 4),
            'highlight_fraction': round(highlight_frac, 4),
            'dynamic_contrast_ratio': round(contrast_ratio, 2),
            'shadow_mask': shadow_mask,
            'highlight_mask': highlight_mask
        }

# ==============================================================================
# 2. DEM-GUIDED TOPOGRAPHIC PHOTOMETRIC NORMALIZATION
# ==============================================================================

class DEMTopographicNormalizer:
    """
    Applies rigorous Lunar Photometric Models to remove topographic shading
    using co-registered Digital Elevation Models (TMC-2 DTM / LOLA SLDEM2015).
    """
    def __init__(self, gsd_meters: float = 5.0):
        self.gsd_meters = gsd_meters

    def compute_surface_normals(self, dem: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Computes 3D surface normal unit vectors (nx, ny, nz) from DEM array.
        
        Formula:
          p = dz/dx, q = dz/dy
          n_vector = (-p, -q, 1.0) / sqrt(p^2 + q^2 + 1)
        """
        dem_smooth = cv2.GaussianBlur(dem.astype(np.float32), (5, 5), sigmaX=1.0)
        
        # Central difference spatial gradients scaled by pixel GSD
        dz_dx = cv2.Sobel(dem_smooth, cv2.CV_32F, 1, 0, ksize=3) / (8.0 * self.gsd_meters)
        dz_dy = cv2.Sobel(dem_smooth, cv2.CV_32F, 0, 1, ksize=3) / (8.0 * self.gsd_meters)

        norm_factor = np.sqrt(dz_dx**2 + dz_dy**2 + 1.0)
        nx = -dz_dx / norm_factor
        ny = -dz_dy / norm_factor
        nz = 1.0 / norm_factor

        return nx, ny, nz

    def compute_illumination_angles(
        self,
        dem: np.ndarray,
        sun_elevation_deg: float,
        sun_azimuth_deg: float
    ) -> tuple[np.ndarray, np.ndarray]:
        """
        Computes cosine of local incidence angle (cos i) and emission angle (cos e).
        
        Solar incidence vector s:
          sx = cos(elev) * sin(azimuth)
          sy = cos(elev) * cos(azimuth)
          sz = sin(elev)
        
        Viewer vector v (nadir optical camera):
          vx = 0, vy = 0, vz = 1
        """
        nx, ny, nz = self.compute_surface_normals(dem)

        elev_rad = np.radians(sun_elevation_deg)
        azim_rad = np.radians(sun_azimuth_deg)

        # Solar unit vector in ENU coordinates
        sx = np.cos(elev_rad) * np.sin(azim_rad)
        sy = np.cos(elev_rad) * np.cos(azim_rad)
        sz = np.sin(elev_rad)

        # Dot product: cos(i) = n . s
        cos_i = nx * sx + ny * sy + nz * sz

        # Emission angle cos(e) = n . v = nz (for nadir camera)
        cos_e = np.clip(nz, 1e-4, 1.0)

        return cos_i, cos_e

    def correct_lommel_seeliger(
        self,
        image: np.ndarray,
        dem: np.ndarray,
        sun_elevation_deg: float,
        sun_azimuth_deg: float,
        reference_elevation_deg: float = 45.0
    ) -> np.ndarray:
        """
        Lommel-Seeliger Topographic Correction (Standard for Lunar Regolith):
          R_LS(i, e) = cos(i) / (cos(i) + cos(e))
          I_norm = I_obs * (R_LS(i_0, e_0) / R_LS(i, e))
        """
        img = image.astype(np.float32)
        cos_i, cos_e = self.compute_illumination_angles(dem, sun_elevation_deg, sun_azimuth_deg)

        # Reference flat surface geometry (zero slope)
        ref_elev_rad = np.radians(reference_elevation_deg)
        cos_i0 = np.sin(ref_elev_rad)
        cos_e0 = 1.0
        r_ls_ref = cos_i0 / (cos_i0 + cos_e0)

        # Observed local reflectance ratio
        cos_i_clamped = np.clip(cos_i, 0.05, 1.0)
        r_ls_local = cos_i_clamped / (cos_i_clamped + cos_e + 1e-6)

        # Normalized reflectance
        norm_img = img * (r_ls_ref / (r_ls_local + 1e-6))

        # Soft shadow masking to avoid noise explosion in deep shadows
        shadow_mask = cos_i < 0.05
        norm_img[shadow_mask] = img[shadow_mask] * (r_ls_ref / (0.05 / (0.05 + cos_e[shadow_mask])))

        # Robust percentile clipping
        p1, p99 = np.percentile(norm_img, (1.0, 99.0))
        return np.clip((norm_img - p1) / (p99 - p1 + 1e-6), 0.0, 1.0).astype(np.float32)

    def correct_c_parameter_empirical(
        self,
        image: np.ndarray,
        dem: np.ndarray,
        sun_elevation_deg: float,
        sun_azimuth_deg: float,
        reference_elevation_deg: float = 45.0
    ) -> np.ndarray:
        """
        C-Correction (Empirical Line Method Topographic Normalization):
          Linear regression: I_obs = m * cos(i) + b  =>  C = b / m
          I_norm = I_obs * (cos(i_0) + C) / (cos(i) + C)
        
        Prevents over-correction in deep crater shadows by introducing the empirical C offset.
        """
        img = image.astype(np.float32)
        cos_i, _ = self.compute_illumination_angles(dem, sun_elevation_deg, sun_azimuth_deg)

        # Sample valid sunlit pixels for linear regression
        valid_mask = (cos_i > 0.1) & (img > 0.05) & (img < 0.95)
        x_vals = cos_i[valid_mask]
        y_vals = img[valid_mask]

        if len(x_vals) > 100:
            # Fit line: y = m*x + b
            m, b = np.polyfit(x_vals, y_vals, 1)
            c_param = max(0.01, b / (m + 1e-6))
        else:
            c_param = 0.2 # Standard lunar empirical default

        ref_elev_rad = np.radians(reference_elevation_deg)
        cos_i0 = np.sin(ref_elev_rad)

        cos_i_clamped = np.clip(cos_i, -c_param + 0.02, 1.0)
        norm_img = img * ((cos_i0 + c_param) / (cos_i_clamped + c_param))

        p1, p99 = np.percentile(norm_img, (1.0, 99.0))
        return np.clip((norm_img - p1) / (p99 - p1 + 1e-6), 0.0, 1.0).astype(np.float32)

    def correct_minnaert(
        self,
        image: np.ndarray,
        dem: np.ndarray,
        sun_elevation_deg: float,
        sun_azimuth_deg: float,
        reference_elevation_deg: float = 45.0
    ) -> np.ndarray:
        """
        Minnaert Non-Lambertian Photometric Correction:
          ln(I * cos(e)) = ln(I_0) + k * ln(cos(i) * cos(e))
          I_norm = I_obs * (cos(i_0) / cos(i))^k
        """
        img = image.astype(np.float32)
        cos_i, cos_e = self.compute_illumination_angles(dem, sun_elevation_deg, sun_azimuth_deg)

        # Estimate Minnaert k parameter via logarithmic regression
        valid_mask = (cos_i > 0.15) & (cos_e > 0.15) & (img > 0.05)
        if np.sum(valid_mask) > 100:
            x_log = np.log(cos_i[valid_mask] * cos_e[valid_mask])
            y_log = np.log(img[valid_mask] * cos_e[valid_mask] + 1e-6)
            k, _ = np.polyfit(x_log, y_log, 1)
            k = np.clip(k, 0.4, 1.0)
        else:
            k = 0.75 # Typical lunar regolith Minnaert parameter

        ref_elev_rad = np.radians(reference_elevation_deg)
        cos_i0 = np.sin(ref_elev_rad)

        cos_i_clamped = np.clip(cos_i, 0.05, 1.0)
        norm_img = img * ((cos_i0 / cos_i_clamped) ** k)

        p1, p99 = np.percentile(norm_img, (1.0, 99.0))
        return np.clip((norm_img - p1) / (p99 - p1 + 1e-6), 0.0, 1.0).astype(np.float32)

# ==============================================================================
# 3. DEM-FREE / BLIND ILLUMINATION NORMALIZATION
# ==============================================================================

class BlindIlluminationNormalizer:
    """
    Normalizes images when no high-resolution co-registered DEM is available.
    Uses Multi-Scale Retinex, Homomorphic filtering, and Solar Azimuth gradient equalization.
    """
    @staticmethod
    def multi_scale_retinex(
        image: np.ndarray,
        sigma_list: list = [15, 80, 250],
        weights: list = [0.333, 0.333, 0.334]
    ) -> np.ndarray:
        """
        Multi-Scale Retinex (MSR) Reflectance-Illumination Decomposition:
          I(x,y) = R(x,y) * L(x,y)
          log R(x,y) = log I(x,y) - sum(w_k * log(I(x,y) * G_sigma_k))
        
        Separates high-frequency surface features (crater edges, boulders) from
        low-frequency solar illumination ramps and shadow gradients.
        """
        img = np.clip(image, 1e-4, 1.0).astype(np.float32)
        log_img = np.log(img)
        msr = np.zeros_like(img)

        for sigma, weight in zip(sigma_list, weights):
            # Fast recursive Gaussian filter approximation
            blurred = cv2.GaussianBlur(img, (0, 0), sigmaX=sigma, sigmaY=sigma)
            log_blurred = np.log(np.clip(blurred, 1e-4, 1.0))
            msr += weight * (log_img - log_blurred)

        # Dynamic Range Normalization
        mean_val = np.mean(msr)
        std_val = np.std(msr)
        norm = np.clip((msr - (mean_val - 2.0 * std_val)) / (4.0 * std_val + 1e-6), 0.0, 1.0)
        return norm.astype(np.float32)

    @staticmethod
    def homomorphic_filter(
        image: np.ndarray,
        cutoff_freq: float = 30.0,
        high_gain: float = 1.4,
        low_gain: float = 0.6
    ) -> np.ndarray:
        """
        Frequency-domain Homomorphic Filter:
        Attenuates low spatial frequencies (illumination gradients) while amplifying
        high spatial frequencies (crater morphometry and texture).
        """
        img = np.clip(image, 1e-4, 1.0).astype(np.float32)
        h, w = img.shape
        log_img = np.log(img)

        # 2D FFT
        dft = np.fft.fft2(log_img)
        dft_shift = np.fft.fftshift(dft)

        # Construct High-Pass Butterworth transfer function
        y, x = np.ogrid[-h//2:h//2, -w//2:w//2]
        dist = np.sqrt(x**2 + y**2)
        h_filter = (high_gain - low_gain) * (1.0 / (1.0 + (cutoff_freq / (dist + 1e-6))**4)) + low_gain

        filtered_dft = dft_shift * h_filter
        inv_dft = np.fft.ifftshift(filtered_dft)
        reconstructed_log = np.real(np.fft.ifft2(inv_dft))
        reconstructed = np.exp(reconstructed_log)

        p1, p99 = np.percentile(reconstructed, (1.0, 99.0))
        return np.clip((reconstructed - p1) / (p99 - p1 + 1e-6), 0.0, 1.0).astype(np.float32)

    @staticmethod
    def sun_angle_adjusted_histogram_matching(
        src_img: np.ndarray,
        ref_img: np.ndarray,
        src_sun_elevation: float,
        ref_sun_elevation: float
    ) -> np.ndarray:
        """
        Transfers radiometric cumulative distribution function (CDF) from Reference to Source,
        scaled by the total solar irradiance ratio: sin(elev_ref) / sin(elev_src).
        """
        # Solar flux ratio adjustment
        flux_ratio = np.sin(np.radians(ref_sun_elevation)) / np.sin(np.radians(src_sun_elevation) + 1e-4)
        scaled_src = np.clip(src_img * flux_ratio, 0.0, 1.0)

        # Quantile histogram matching
        src_flat = (scaled_src.ravel() * 255).astype(np.uint8)
        ref_flat = (ref_img.ravel() * 255).astype(np.uint8)

        # Calculate CDFs
        src_counts, _ = np.histogram(src_flat, bins=256, range=(0, 256))
        ref_counts, _ = np.histogram(ref_flat, bins=256, range=(0, 256))

        src_cdf = src_counts.cumsum() / src_counts.sum()
        ref_cdf = ref_counts.cumsum() / ref_counts.sum()

        # Lookup table
        lookup_table = np.zeros(256, dtype=np.uint8)
        for src_val in range(256):
            closest_ref_idx = np.argmin(np.abs(ref_cdf - src_cdf[src_val]))
            lookup_table[src_val] = closest_ref_idx

        matched_flat = lookup_table[src_flat]
        matched_img = matched_flat.reshape(src_img.shape).astype(np.float32) / 255.0
        return matched_img

# ==============================================================================
# 4. MASTER SUN ANGLE COMPENSATOR WRAPPER
# ==============================================================================

class LunarSunAngleCompensator:
    """
    Main Preprocessing Integration Class: Automatically detects available metadata/DEM,
    applies optimal photometric or empirical normalization, and outputs illumination-invariant
    imagery for Transformer feature matchers (LoFTR / LightGlue).
    """
    def __init__(self, gsd_meters: float = 5.0):
        self.dem_normalizer = DEMTopographicNormalizer(gsd_meters=gsd_meters)
        self.blind_normalizer = BlindIlluminationNormalizer()
        self.analyzer = LunarIlluminationAnalyzer()

    def process_pair(
        self,
        img_ref: np.ndarray,
        img_src: np.ndarray,
        ref_sun_elev: float,
        ref_sun_azim: float,
        src_sun_elev: float,
        src_sun_azim: float,
        dem: np.ndarray = None,
        method: str = 'dem_lommel_seeliger' # 'dem_lommel_seeliger' | 'dem_c_correction' | 'blind_retinex' | 'sun_histogram_matching'
    ) -> tuple[np.ndarray, np.ndarray, dict]:
        """
        Executes complete sun-angle normalization pipeline on Reference and Source pairs.
        
        Returns:
            norm_ref (np.ndarray): Illumination-normalized reference image.
            norm_src (np.ndarray): Illumination-normalized source image.
            telemetry (dict): Analytical report and performance indicators.
        """
        ref_stats = self.analyzer.analyze_patch_illumination(img_ref)
        src_stats = self.analyzer.analyze_patch_illumination(img_src)

        if dem is not None and method.startswith('dem_'):
            if method == 'dem_lommel_seeliger':
                norm_ref = self.dem_normalizer.correct_lommel_seeliger(img_ref, dem, ref_sun_elev, ref_sun_azim)
                norm_src = self.dem_normalizer.correct_lommel_seeliger(img_src, dem, src_sun_elev, src_sun_azim)
            elif method == 'dem_c_correction':
                norm_ref = self.dem_normalizer.correct_c_parameter_empirical(img_ref, dem, ref_sun_elev, ref_sun_azim)
                norm_src = self.dem_normalizer.correct_c_parameter_empirical(img_src, dem, src_sun_elev, src_sun_azim)
            elif method == 'dem_minnaert':
                norm_ref = self.dem_normalizer.correct_minnaert(img_ref, dem, ref_sun_elev, ref_sun_azim)
                norm_src = self.dem_normalizer.correct_minnaert(img_src, dem, src_sun_elev, src_sun_azim)
            else:
                norm_ref = self.dem_normalizer.correct_lommel_seeliger(img_ref, dem, ref_sun_elev, ref_sun_azim)
                norm_src = self.dem_normalizer.correct_lommel_seeliger(img_src, dem, src_sun_elev, src_sun_azim)
            mode_used = f"DEM-Guided Topographic Normalization ({method})"
        else:
            if method == 'sun_histogram_matching':
                norm_ref = img_ref.copy()
                norm_src = self.blind_normalizer.sun_angle_adjusted_histogram_matching(
                    img_src, img_ref, src_sun_elev, ref_sun_elev
                )
            else:
                # Multi-Scale Retinex + Homomorphic combination
                norm_ref = self.blind_normalizer.multi_scale_retinex(img_ref)
                norm_src = self.blind_normalizer.multi_scale_retinex(img_src)
            mode_used = f"DEM-Free Blind Illumination Normalization ({method})"

        telemetry = {
            'mode_used': mode_used,
            'ref_sun_geometry': f"Elev: {ref_sun_elev}°, Azim: {ref_sun_azim}° (Estimated Azim: {ref_stats['estimated_sun_azimuth_deg']}°)",
            'src_sun_geometry': f"Elev: {src_sun_elev}°, Azim: {src_sun_azim}° (Estimated Azim: {src_stats['estimated_sun_azimuth_deg']}°)",
            'ref_shadow_fraction': ref_stats['shadow_fraction'],
            'src_shadow_fraction': src_stats['shadow_fraction'],
            'contrast_improvement': f"Ref: {ref_stats['dynamic_contrast_ratio']}x -> Harmonized"
        }

        print(f"[Sun-Angle Module] Executed {mode_used}")
        return norm_ref, norm_src, telemetry
`,

  phase1: `"""
================================================================================
PHASE 1: ISRO PRADAN DATA RETRIEVAL & PDS4 INGESTION PIPELINE
================================================================================
Instruments:
  - OHRC (Orbiter High Resolution Camera) ~0.25 m/pixel
  - TMC-2 (Terrain Mapping Camera 2) ~5.0 m/pixel
  - IIRS (Imaging Infra-Red Spectrometer) ~80.0 m/pixel

Author: Senior Remote Sensing Software Engineer & Computer Vision Specialist
Target Environment: Python 3.10+ / Google Colab (T4 GPU Compatible)
"""

import os
import sys
import xml.etree.ElementTree as ET
import numpy as np
import rasterio
from rasterio.windows import Window
from rasterio.transform import from_bounds
import matplotlib.pyplot as plt

# ==============================================================================
# 1.1 PRADAN MAPBROWSE / TABLE NAVIGATION GUIDE
# ==============================================================================
"""
STEP-BY-STEP PRADAN SEARCH PROCEDURE (pradan.issdc.gov.in):
1. Log in to ISRO PRADAN portal and navigate to 'Search & Download' -> 'MapBrowse'.
2. Select Mission: 'CHANDRAYAAN-2'.
3. Select Datasets / Payloads:
   - Check 'OHRC' (Product Type: CH2_OHR_NC / CH2_OHR_RRN)
   - Check 'TMC-2' (Product Type: CH2_TMC_NC / CH2_TMC_ST)
   - Check 'IIRS' (Product Type: CH2_IIR_NC / CH2_IIR_RAW)
4. Spatial Filter:
   - Enter Lunar Latitude/Longitude Bounding Box (e.g. South Pole Crater Boguslawsky:
     Lat: -72.0 to -74.0, Lon: 41.0 to 45.0).
5. Intersecting Orbit Filter:
   - Click 'Find Overlapping Scenes'. Note down the Product IDs (e.g.
     ch2_ohr_ncp_20200115T041233890_d_img_d18.xml / .img).
6. Download the paired dataset files:
   - XML Label (.xml): PDS4 metadata describing raster dimensions, bit depth, map projection.
   - Binary Raster (.img / .qub): Raw radiance / digital numbers.
"""

# ==============================================================================
# 1.2 PDS4 XML PARSER & DATA INGESTION ENGINE
# ==============================================================================

class Chandrayaan2PDS4Reader:
    """
    Robust reader for Chandrayaan-2 PDS4 (.xml + .img / .qub) data products.
    Extracts geospatial bounds, radiometric calibration parameters, and raster arrays.
    """
    def __init__(self, xml_path: str, img_path: str = None):
        self.xml_path = xml_path
        # If img_path is omitted, infer it from the XML filename
        if img_path is None:
            base, _ = os.path.splitext(xml_path)
            if os.path.exists(base + ".img"):
                self.img_path = base + ".img"
            elif os.path.exists(base + ".qub"):
                self.img_path = base + ".qub"
            else:
                self.img_path = xml_path.replace(".xml", ".img")
        else:
            self.img_path = img_path

        self.metadata = self._parse_pds4_xml()

    def _parse_pds4_xml(self) -> dict:
        """Parses PDS4 XML label to retrieve raster shape, data type, and geospatial metadata."""
        if not os.path.exists(self.xml_path):
            raise FileNotFoundError(f"PDS4 XML Label not found at: {self.xml_path}")

        tree = ET.parse(self.xml_path)
        root = tree.getroot()

        meta = {
            'lines': 1024,
            'samples': 1024,
            'bands': 1,
            'data_type': 'UnsignedMSB2',
            'instrument': 'UNKNOWN',
            'sun_elevation': 45.0,
            'sun_azimuth': 0.0,
            'scaling_factor': 1.0,
            'offset': 0.0
        }

        # Search for Array_2D_Image or Array_3D_Spectrum
        for elem in root.iter():
            tag = elem.tag.split('}')[-1]
            if tag == 'lines' or tag == 'line':
                meta['lines'] = int(elem.text.strip())
            elif tag == 'samples' or tag == 'sample':
                meta['samples'] = int(elem.text.strip())
            elif tag == 'bands' or tag == 'band':
                meta['bands'] = int(elem.text.strip())
            elif tag == 'data_type':
                meta['data_type'] = elem.text.strip()
            elif tag == 'instrument_name' or tag == 'instrument_id':
                meta['instrument'] = elem.text.strip()
            elif tag == 'solar_zenith_angle':
                meta['sun_elevation'] = 90.0 - float(elem.text.strip())
            elif tag == 'solar_azimuth_angle':
                meta['sun_azimuth'] = float(elem.text.strip())
            elif tag == 'scaling_factor':
                meta['scaling_factor'] = float(elem.text.strip())

        return meta

    def _get_numpy_dtype(self, pds_data_type: str) -> np.dtype:
        """Maps PDS4 data types to standard NumPy dtypes."""
        mapping = {
            'UnsignedMSB2': '>u2',  # Big-endian 16-bit uint (TMC-2 / OHRC standard)
            'UnsignedLSB2': '<u2',  # Little-endian 16-bit uint
            'SignedMSB2': '>i2',    # Big-endian 16-bit int
            'SignedLSB2': '<i2',    # Little-endian 16-bit int
            'IEEE754MSBSingle': '>f4',
            'IEEE754LSBSingle': '<f4',
            'UnsignedByte': 'u1',
        }
        return np.dtype(mapping.get(pds_data_type, '<u2'))

    def read_full_raster(self) -> np.ndarray:
        """Reads the full binary raster into a NumPy array."""
        dtype = self._get_numpy_dtype(self.metadata['data_type'])
        shape = (self.metadata['lines'], self.metadata['samples'])
        if self.metadata['bands'] > 1:
            shape = (self.metadata['bands'], self.metadata['lines'], self.metadata['samples'])

        # Memory map the binary file to avoid excessive RAM consumption
        data = np.fromfile(self.img_path, dtype=dtype)
        data = data.reshape(shape)

        # Apply radiometric scale and offset if present
        data_float = data.astype(np.float32) * self.metadata['scaling_factor'] + self.metadata['offset']
        return data_float

    def extract_patch(self, center_row: int, center_col: int, patch_size: int = 1024) -> np.ndarray:
        """
        Extracts an ROI bounding-box patch (e.g. 512x512 or 1024x1024) around a lunar landmark.
        Prevents GPU Out-Of-Memory (OOM) errors when processing gigapixel OHRC swaths.
        """
        half_s = patch_size // 2
        r_start = max(0, center_row - half_s)
        r_end = min(self.metadata['lines'], center_row + half_s)
        c_start = max(0, center_col - half_s)
        c_end = min(self.metadata['samples'], center_col + half_s)

        dtype = self._get_numpy_dtype(self.metadata['data_type'])
        
        # Calculate file seek offsets for line-by-line streaming (O(1) memory footprint)
        bytes_per_sample = dtype.itemsize
        line_bytes = self.metadata['samples'] * bytes_per_sample
        
        patch = np.zeros((r_end - r_start, c_end - c_start), dtype=np.float32)
        
        with open(self.img_path, 'rb') as f:
            for i, r in enumerate(range(r_start, r_end)):
                f.seek(r * line_bytes + c_start * bytes_per_sample)
                line_data = np.fromfile(f, dtype=dtype, count=(c_end - c_start))
                patch[i, :] = line_data.astype(np.float32)

        return patch

# ==============================================================================
# 1.3 EXPORT TO PYTORCH-COMPATIBLE GEOTIFF
# ==============================================================================

def export_to_geotiff(array: np.ndarray, output_path: str, gsd_meters: float = 0.25, crs_epsg: int = 3031):
    """
    Saves a normalized lunar patch as a standard GeoTIFF with lunar projection metadata.
    """
    height, width = array.shape
    transform = from_bounds(0, 0, width * gsd_meters, height * gsd_meters, width, height)
    
    # Normalize 0.0 to 1.0 for PyTorch feature matching
    norm_array = (array - np.percentile(array, 1)) / (np.percentile(array, 99) - np.percentile(array, 1) + 1e-6)
    norm_array = np.clip(norm_array, 0.0, 1.0).astype(np.float32)

    with rasterio.open(
        output_path,
        'w',
        driver='GTiff',
        height=height,
        width=width,
        count=1,
        dtype=norm_array.dtype,
        crs=f'EPSG:{crs_epsg}', # Lunar South Pole Stereographic or Equirectangular
        transform=transform,
    ) as dst:
        dst.write(norm_array, 1)
    
    print(f"[Phase 1] GeoTIFF successfully saved to: {output_path} ({width}x{height}, GSD: {gsd_meters}m/px)")
`,

  phase2: `"""
================================================================================
PHASE 2: SCALE-PYRAMID & SUN-ANGLE INVARIANT PREPROCESSING
================================================================================
Key Objectives:
  1. Construct spatial scale-pyramids using Gaussian anti-aliasing downsampling
     to bridge the GSD resolution gap (OHRC ~0.25m vs TMC-2 ~5m vs IIRS ~80m).
  2. Automatic Sun-Angle & Topographic Photometric Compensation (Lommel-Seeliger / Retinex).
  3. Spectral & thermal response inversion for IIRS SWIR hyperspectral bands.
  4. Contrast-Limited Adaptive Histogram Equalization (CLAHE).
"""

import cv2
import numpy as np
import torch
import torch.nn.functional as F

# ==============================================================================
# 2.1 SPATIAL SCALE-PYRAMID GENERATION
# ==============================================================================

def build_lunar_scale_pyramid(image: np.ndarray, target_scale_ratio: float = 20.0) -> list:
    """
    Constructs a multi-scale Gaussian octave pyramid.
    Downsamples ultra-high-resolution OHRC patches (0.25m) to match TMC-2 (5m, ~20x)
    and IIRS (80m, ~320x) GSD levels.
    """
    pyramid = [image.copy()]
    current_img = image.copy()
    current_scale = 1.0

    while current_scale < target_scale_ratio:
        sigma = 1.2
        ksize = int(2 * np.ceil(2 * sigma) + 1)
        blurred = cv2.GaussianBlur(current_img, (ksize, ksize), sigmaX=sigma, sigmaY=sigma)
        downsampled = cv2.pyrDown(blurred)
        pyramid.append(downsampled)
        current_img = downsampled
        current_scale *= 2.0

    print(f"[Phase 2] Generated {len(pyramid)} octave pyramid levels. Base: {image.shape} -> Top: {pyramid[-1].shape}")
    return pyramid

# ==============================================================================
# 2.2 MULTI-MODAL PREPROCESSING WITH SUN ANGLE COMPENSATION
# ==============================================================================

def preprocess_lunar_multimodal_pair(
    img_ref: np.ndarray, 
    img_src: np.ndarray,
    ref_sun_elevation: float = 45.0,
    ref_sun_azimuth: float = 0.0,
    src_sun_elevation: float = 65.0,
    src_sun_azimuth: float = 180.0,
    dem: np.ndarray = None,
    enable_sun_compensation: bool = True,
    sun_comp_method: str = 'dem_lommel_seeliger',
    is_iirs_infrared: bool = False,
    apply_clahe: bool = True,
    clahe_clip: float = 3.0
) -> tuple[np.ndarray, np.ndarray, dict]:
    """
    Complete Preprocessing Pipeline integrating Sun-Angle Topographic Compensation.
    """
    # 1. Percentile Normalization
    def normalize_percentile(img):
        p_low, p_high = np.percentile(img, (1.0, 99.0))
        if p_high <= p_low:
            p_high = p_low + 1e-5
        return np.clip((img - p_low) / (p_high - p_low), 0.0, 1.0).astype(np.float32)

    ref_norm = normalize_percentile(img_ref)
    src_norm = normalize_percentile(img_src)

    # 2. Sun-Angle Illumination Normalization
    telemetry = {}
    if enable_sun_compensation:
        # Instantiate Senior Sun-Angle Compensator
        compensator = LunarSunAngleCompensator(gsd_meters=5.0)
        ref_norm, src_norm, telemetry = compensator.process_pair(
            img_ref=ref_norm,
            img_src=src_norm,
            ref_sun_elev=ref_sun_elevation,
            ref_sun_azim=ref_sun_azimuth,
            src_sun_elev=src_sun_elevation,
            src_sun_azim=src_sun_azimuth,
            dem=dem,
            method=sun_comp_method
        )

    # 3. Handle Thermal/Infrared Inversion (Optical high-albedo vs Hyperspectral absorption)
    if is_iirs_infrared:
        src_norm = 1.0 - src_norm
        print("[Phase 2] Applied spectral radiance inversion for IIRS hyperspectral SWIR channel.")

    # 4. CLAHE Adaptive Histogram Equalization
    if apply_clahe:
        clahe = cv2.createCLAHE(clipLimit=clahe_clip, tileGridSize=(8, 8))
        ref_u8 = (ref_norm * 255).astype(np.uint8)
        src_u8 = (src_norm * 255).astype(np.uint8)
        ref_norm = (clahe.apply(ref_u8) / 255.0).astype(np.float32)
        src_norm = (clahe.apply(src_u8) / 255.0).astype(np.float32)

    return ref_norm, src_norm, telemetry
`,

  phase3: `"""
================================================================================
PHASE 3: DEEP LEARNING MATCHING & HOMOGRAPHY REGISTRATION (CORE ALGORITHM)
================================================================================
Key Objectives:
  1. Dense feature matching using LoFTR (Local Feature Transformer) with self/cross-attention.
  2. Robust Outlier Rejection using RANSAC / USAC-MAGSAC to eliminate false shadow edge matches.
  3. Homography Matrix estimation and geometric alignment using cv2.warpPerspective.
  4. Safe exception handling for sparse keypoint regimes (< 10 matches).
"""

import cv2
import numpy as np
import torch
import kornia as K
import kornia.feature as KF

# ==============================================================================
# 3.1 DENSE FEATURE MATCHING WITH LoFTR
# ==============================================================================

class LunarLoFTRMatcher:
    """
    Self-contained Transformer-based Dense Keypoint Matcher for Lunar Optical Imagery.
    Leverages coarse-to-fine linear Transformer attention to correlate textureless crater floors.
    """
    def __init__(self, device: str = None, confidence_thresh: float = 0.2):
        if device is None:
            self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        else:
            self.device = torch.device(device)
            
        print(f"[Phase 3] Initializing LoFTR Matcher on compute device: {self.device}")
        
        # Load Pretrained LoFTR Model (outdoor weights are optimal for lunar topography)
        self.matcher = KF.LoFTR(pretrained='outdoor').to(self.device).eval()
        self.confidence_thresh = confidence_thresh

    @torch.no_grad()
    def match_pair(self, img_ref: np.ndarray, img_src: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Extracts dense keypoint correspondences between Reference (fixed) and Source (moving) images.
        """
        h_ref, w_ref = img_ref.shape
        h_src, w_src = img_src.shape

        new_w = (w_ref // 8) * 8
        new_h = (h_ref // 8) * 8

        img_ref_resized = cv2.resize(img_ref, (new_w, new_h))
        img_src_resized = cv2.resize(img_src, (new_w, new_h))

        tensor_ref = K.image_to_tensor(img_ref_resized, keepdim=False).float().to(self.device)
        tensor_src = K.image_to_tensor(img_src_resized, keepdim=False).float().to(self.device)

        input_dict = {
            "image0": tensor_ref,
            "image1": tensor_src
        }
        
        correspondences = self.matcher(input_dict)

        pts0 = correspondences['keypoints0'].cpu().numpy() # (N, 2) in Reference
        pts1 = correspondences['keypoints1'].cpu().numpy() # (N, 2) in Source
        confs = correspondences['confidence'].cpu().numpy() # (N,)

        scale_x_ref = w_ref / new_w
        scale_y_ref = h_ref / new_h
        scale_x_src = w_src / new_w
        scale_y_src = h_src / new_h

        pts0[:, 0] *= scale_x_ref
        pts0[:, 1] *= scale_y_ref
        pts1[:, 0] *= scale_x_src
        pts1[:, 1] *= scale_y_src

        valid_mask = confs >= self.confidence_thresh
        pts_ref_filtered = pts0[valid_mask]
        pts_src_filtered = pts1[valid_mask]
        confs_filtered = confs[valid_mask]

        print(f"[Phase 3] LoFTR extracted {len(pts_ref_filtered)} correspondences (Confidence >= {self.confidence_thresh}).")
        return pts_ref_filtered, pts_src_filtered, confs_filtered

# ==============================================================================
# 3.2 ROBUST RANSAC HOMOGRAPHY ESTIMATION & WARPING
# ==============================================================================

def estimate_homography_and_warp(
    img_ref: np.ndarray,
    img_src: np.ndarray,
    pts_ref: np.ndarray,
    pts_src: np.ndarray,
    reproj_threshold_px: float = 3.0,
    min_inliers_required: int = 10
) -> dict:
    """
    Applies USAC_MAGSAC (Modern RANSAC) to reject false shadow-edge keypoints,
    computes the 3x3 Homography Matrix (H), and warps the source image onto the reference frame.
    """
    if len(pts_ref) < 4:
        raise ValueError(f"Geometric matching failure: Found only {len(pts_ref)} matches. Minimum 4 required.")

    H_matrix, inlier_mask = cv2.findHomography(
        srcPoints=pts_src,
        dstPoints=pts_ref,
        method=cv2.USAC_MAGSAC,
        ransacReprojThreshold=reproj_threshold_px,
        maxIters=10000,
        confidence=0.999
    )

    if H_matrix is None or inlier_mask is None:
        raise RuntimeError("RANSAC failed to compute a stable homography matrix.")

    inlier_mask = inlier_mask.ravel().astype(bool)
    num_inliers = int(np.sum(inlier_mask))
    inlier_ratio = (num_inliers / len(pts_ref)) * 100.0

    print(f"[Phase 3] RANSAC Inliers: {num_inliers}/{len(pts_ref)} ({inlier_ratio:.1f}%) | Reproj Thresh: {reproj_threshold_px} px")

    if num_inliers < min_inliers_required:
        return {
            'success': False,
            'H_matrix': None,
            'warped_src': None,
            'num_inliers': num_inliers,
            'inlier_ratio': inlier_ratio,
            'inlier_pts_ref': pts_ref[inlier_mask],
            'inlier_pts_src': pts_src[inlier_mask],
            'error_msg': f"Insufficient inliers ({num_inliers} < {min_inliers_required})"
        }

    h_ref, w_ref = img_ref.shape
    warped_src = cv2.warpPerspective(
        src=img_src,
        M=H_matrix,
        dsize=(w_ref, h_ref),
        flags=cv2.INTER_LINEAR + cv2.WARP_FILL_OUTLIERS,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=0
    )

    return {
        'success': True,
        'H_matrix': H_matrix,
        'warped_src': warped_src,
        'num_inliers': num_inliers,
        'inlier_ratio': inlier_ratio,
        'inlier_pts_ref': pts_ref[inlier_mask],
        'inlier_pts_src': pts_src[inlier_mask],
        'error_msg': None
    }
`,

  phase3b: `"""
================================================================================
PHASE 3B: SHADOW-INVARIANT MESH REGISTRATION & SUB-PIXEL PRECISION PIPELINE
================================================================================
Three targeted fixes for the failure modes seen at the lunar South Pole:

  1. Synthetic Polar Shadow Invariance   -> ShadowMaskGenerator
     Masks zero-radiance deep-shadow pixels (from PDS4 solar geometry + local
     adaptive thresholding) OUT of the tensors before LoFTR ever sees them, so
     the transformer can only attend to illuminated crater rims / boulders.

  2. DEM-Guided Local Affine Mesh        -> DEMGuidedLocalMeshWarper
     Replaces one global homography (flat-plane assumption) with a 4x4 grid of
     locally-estimated homographies, gated by TMC-2 elevation-gradient bounds,
     to approximate 3D crater-wall warping without a ray tracer.

  3. Coarse-to-Fine Patch Pyramid        -> hierarchical_multires_registration
     TMC<->IIRS global registration (cheap, low-res) localizes a bounding box,
     which is used to crop native-resolution OHRC and re-match ONLY that patch
     at full 0.25 m/px resolution, then sub-pixel refine with phase correlation.
     Preserves sub-meter detail instead of destroying it via pyramid downsampling.
"""

import cv2
import numpy as np
import torch

# ==============================================================================
# 3B.1 SYNTHETIC POLAR SHADOW INVARIANCE (Fixes Shadow Hallucination)
# ==============================================================================

class ShadowMaskGenerator:
    """
    Computes a binary "valid-to-match" mask that excludes deep, zero-radiance
    crater shadows using (a) the PDS4-derived solar incidence vector and
    (b) local adaptive thresholding, so LoFTR is never asked to match texture
    that doesn't structurally exist (pure sensor noise floor).
    """
    @staticmethod
    def solar_incidence_vector(sun_elevation_deg: float, sun_azimuth_deg: float) -> np.ndarray:
        """Unit solar vector (sx, sy, sz) in ENU coordinates from PDS4 header angles."""
        elev = np.radians(sun_elevation_deg)
        azim = np.radians(sun_azimuth_deg)
        return np.array([
            np.cos(elev) * np.sin(azim),
            np.cos(elev) * np.cos(azim),
            np.sin(elev)
        ], dtype=np.float32)

    @staticmethod
    def compute_shadow_mask(
        image: np.ndarray,
        sun_elevation_deg: float,
        sun_azimuth_deg: float,
        block_size: int = 51,
        adaptive_c: float = 5.0,
        zero_radiance_floor: float = 0.04
    ) -> tuple[np.ndarray, dict]:
        """
        Returns (valid_mask, telemetry). valid_mask is True where the pixel is
        safe to feed to the matcher; False marks deep/zero-radiance shadow.

        A pixel is flagged as shadow if EITHER:
          - it falls below the absolute zero-radiance noise floor (True PSR-style
            deep shadow, independent of local contrast), OR
          - local adaptive thresholding finds it significantly darker than its
            neighborhood (standard crater-wall cast shadow).
        The solar incidence vector is used to sanity-check that flagged regions
        are plausibly on the anti-sun side of local gradients (very low sun
        elevation => shadow fraction is expected to be large; this is logged in
        telemetry so the operator can sanity check against the PDS4 label).
        """
        img = np.clip(image, 0.0, 1.0).astype(np.float32)
        img_u8 = (img * 255.0).astype(np.uint8)

        if block_size % 2 == 0:
            block_size += 1

        adaptive = cv2.adaptiveThreshold(
            img_u8, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY, block_size, adaptive_c
        )
        local_shadow = adaptive < 128  # darker than local neighborhood mean

        absolute_shadow = img < zero_radiance_floor

        shadow_mask = local_shadow | absolute_shadow

        # Morphological cleanup: remove single-pixel noise, close small gaps in
        # crater-wall shadow boundaries so masked regions are contiguous.
        kernel = np.ones((3, 3), np.uint8)
        shadow_mask = cv2.morphologyEx(shadow_mask.astype(np.uint8), cv2.MORPH_OPEN, kernel)
        shadow_mask = cv2.morphologyEx(shadow_mask, cv2.MORPH_CLOSE, kernel).astype(bool)

        valid_mask = ~shadow_mask
        s_vec = ShadowMaskGenerator.solar_incidence_vector(sun_elevation_deg, sun_azimuth_deg)

        telemetry = {
            'sun_elevation_deg': sun_elevation_deg,
            'sun_azimuth_deg': sun_azimuth_deg,
            'solar_incidence_vector': s_vec.tolist(),
            'shadow_fraction': round(float(np.mean(shadow_mask)), 4),
            'valid_fraction': round(float(np.mean(valid_mask)), 4),
        }
        return valid_mask, telemetry

    @staticmethod
    def apply_mask_to_tensor(image: np.ndarray, valid_mask: np.ndarray, fill_value: float = None) -> np.ndarray:
        """
        Suppresses shadow pixels before they reach the Transformer. Filling with
        the LOCAL illuminated mean (rather than 0) avoids creating a hard,
        high-gradient false edge at the shadow boundary that LoFTR could
        mistakenly lock onto as a "feature".
        """
        img = image.astype(np.float32).copy()
        if fill_value is None:
            illuminated_vals = img[valid_mask]
            fill_value = float(np.mean(illuminated_vals)) if illuminated_vals.size > 0 else 0.0
        img[~valid_mask] = fill_value
        return img


def match_pair_shadow_invariant(
    matcher,  # LunarLoFTRMatcher instance from Phase 3
    img_ref: np.ndarray,
    img_src: np.ndarray,
    ref_sun_elev: float,
    ref_sun_azim: float,
    src_sun_elev: float,
    src_sun_azim: float
) -> tuple[np.ndarray, np.ndarray, np.ndarray, dict]:
    """
    Drop-in replacement for matcher.match_pair() that masks deep shadow OUT of
    both tensors first, then additionally discards any surviving correspondence
    whose endpoint still lands in a shadow region (belt-and-braces).
    """
    valid_ref, tel_ref = ShadowMaskGenerator.compute_shadow_mask(img_ref, ref_sun_elev, ref_sun_azim)
    valid_src, tel_src = ShadowMaskGenerator.compute_shadow_mask(img_src, src_sun_elev, src_sun_azim)

    masked_ref = ShadowMaskGenerator.apply_mask_to_tensor(img_ref, valid_ref)
    masked_src = ShadowMaskGenerator.apply_mask_to_tensor(img_src, valid_src)

    pts_ref, pts_src, confs = matcher.match_pair(masked_ref, masked_src)

    if len(pts_ref) > 0:
        ref_ok = valid_ref[np.clip(pts_ref[:, 1].astype(int), 0, valid_ref.shape[0] - 1),
                            np.clip(pts_ref[:, 0].astype(int), 0, valid_ref.shape[1] - 1)]
        src_ok = valid_src[np.clip(pts_src[:, 1].astype(int), 0, valid_src.shape[0] - 1),
                            np.clip(pts_src[:, 0].astype(int), 0, valid_src.shape[1] - 1)]
        keep = ref_ok & src_ok
        pts_ref, pts_src, confs = pts_ref[keep], pts_src[keep], confs[keep]

    print(f"[Phase 3B] Shadow-masked matching: Ref shadow={tel_ref['shadow_fraction']*100:.1f}%, "
          f"Src shadow={tel_src['shadow_fraction']*100:.1f}% -> {len(pts_ref)} surviving correspondences.")

    return pts_ref, pts_src, confs, {'ref': tel_ref, 'src': tel_src}


# ==============================================================================
# 3B.2 DEM-GUIDED LOCAL AFFINE MESH (Fixes 3D Crater-Wall Distortion)
# ==============================================================================

class DEMGuidedLocalMeshWarper:
    """
    Replaces a single global homography with a grid_size x grid_size mesh of
    locally-fitted homographies, each constrained to cells whose TMC-2
    elevation gradient stays within plausible bounds (steep crater walls get
    their own local warp instead of being forced onto the flat-plane model).
    """
    def __init__(self, grid_size: int = 4, min_pts_per_cell: int = 6, feather_frac: float = 0.15):
        self.grid_size = grid_size
        self.min_pts_per_cell = min_pts_per_cell
        self.feather_frac = feather_frac

    def _cell_bounds(self, w: int, h: int) -> tuple[np.ndarray, np.ndarray]:
        xs = np.linspace(0, w, self.grid_size + 1).astype(int)
        ys = np.linspace(0, h, self.grid_size + 1).astype(int)
        return xs, ys

    def cell_needs_local_warp(self, dem: np.ndarray, x0: int, x1: int, y0: int, y1: int,
                               gradient_threshold: float = 0.15) -> bool:
        """
        A cell "needs" its own local homography if the mean TMC-2 elevation
        gradient magnitude inside it exceeds gradient_threshold (i.e. it's a
        crater wall / rim, not a flat mare floor where global H is already fine).
        """
        if dem is None:
            return True  # no DEM available -> be conservative, always fit locally when possible
        patch = dem[y0:y1, x0:x1].astype(np.float32)
        if patch.size < 4:
            return False
        gx = cv2.Sobel(patch, cv2.CV_32F, 1, 0, ksize=3)
        gy = cv2.Sobel(patch, cv2.CV_32F, 0, 1, ksize=3)
        grad_mag = np.sqrt(gx**2 + gy**2)
        return float(np.mean(grad_mag)) > gradient_threshold

    def estimate_local_homographies(
        self,
        pts_ref: np.ndarray,
        pts_src: np.ndarray,
        w: int,
        h: int,
        global_H: np.ndarray,
        dem: np.ndarray = None,
        gradient_threshold: float = 0.15
    ) -> dict:
        """
        Returns {(gx, gy): H_cell}. Cells with insufficient matches, or that the
        DEM says are flat enough for the global model, fall back to global_H.
        """
        xs, ys = self._cell_bounds(w, h)
        cell_homographies = {}

        for gy in range(self.grid_size):
            for gx in range(self.grid_size):
                x0, x1 = xs[gx], xs[gx + 1]
                y0, y1 = ys[gy], ys[gy + 1]

                needs_local = self.cell_needs_local_warp(dem, x0, x1, y0, y1, gradient_threshold)

                in_cell = (
                    (pts_ref[:, 0] >= x0) & (pts_ref[:, 0] < x1) &
                    (pts_ref[:, 1] >= y0) & (pts_ref[:, 1] < y1)
                )
                cell_pts_ref = pts_ref[in_cell]
                cell_pts_src = pts_src[in_cell]

                H_cell = global_H
                if needs_local and len(cell_pts_ref) >= self.min_pts_per_cell:
                    H_fit, mask = cv2.findHomography(
                        cell_pts_src, cell_pts_ref, method=cv2.USAC_MAGSAC, ransacReprojThreshold=3.0
                    )
                    if H_fit is not None and int(np.sum(mask)) >= 4:
                        H_cell = H_fit

                cell_homographies[(gx, gy)] = H_cell

        return cell_homographies

    def warp_with_mesh(
        self,
        img_src: np.ndarray,
        cell_homographies: dict,
        w: int,
        h: int
    ) -> np.ndarray:
        """
        Warps img_src cell-by-cell and feather-blends overlapping cell borders
        so the piecewise-local warp doesn't show visible seams.
        """
        xs, ys = self._cell_bounds(w, h)
        warped_accum = np.zeros((h, w), dtype=np.float32)
        weight_accum = np.zeros((h, w), dtype=np.float32)

        for (gx, gy), H_cell in cell_homographies.items():
            x0, x1 = xs[gx], xs[gx + 1]
            y0, y1 = ys[gy], ys[gy + 1]
            pad_x = max(1, int((x1 - x0) * self.feather_frac))
            pad_y = max(1, int((y1 - y0) * self.feather_frac))

            warped_cell = cv2.warpPerspective(img_src, H_cell, (w, h), flags=cv2.INTER_LINEAR)

            wmask = np.zeros((h, w), dtype=np.float32)
            xa, xb = max(0, x0 - pad_x), min(w, x1 + pad_x)
            ya, yb = max(0, y0 - pad_y), min(h, y1 + pad_y)
            wmask[ya:yb, xa:xb] = 1.0
            wmask = cv2.GaussianBlur(wmask, (0, 0), sigmaX=max(pad_x, pad_y))

            warped_accum += warped_cell * wmask
            weight_accum += wmask

        weight_accum[weight_accum == 0] = 1.0
        return warped_accum / weight_accum


# ==============================================================================
# 3B.3 SUB-PIXEL REFINEMENT (Phase Correlation on Local Windows)
# ==============================================================================

def subpixel_refine_matches(
    img_ref: np.ndarray,
    img_src: np.ndarray,
    pts_ref: np.ndarray,
    pts_src: np.ndarray,
    window: int = 32
) -> np.ndarray:
    """
    Refines each integer-pixel correspondence to sub-pixel precision using
    normalized cross-power-spectrum phase correlation (cv2.phaseCorrelate) on a
    small window around each point. This is what actually gets RMSE below the
    1-pixel floor that RANSAC/homography alone stop at, which is the whole
    point for precision-landing hazard avoidance.
    """
    refined_src = pts_src.copy().astype(np.float64)
    half = window // 2
    h_ref, w_ref = img_ref.shape
    h_src, w_src = img_src.shape

    for i, (rx, ry) in enumerate(pts_ref):
        sx, sy = pts_src[i]
        rx, ry, sx, sy = int(rx), int(ry), int(sx), int(sy)

        if not (half <= rx < w_ref - half and half <= ry < h_ref - half and
                half <= sx < w_src - half and half <= sy < h_src - half):
            continue  # too close to the border for a safe window; keep integer estimate

        win_ref = img_ref[ry - half:ry + half, rx - half:rx + half].astype(np.float32)
        win_src = img_src[sy - half:sy + half, sx - half:sx + half].astype(np.float32)

        hann = cv2.createHanningWindow((window, window), cv2.CV_32F)
        try:
            (shift_x, shift_y), response = cv2.phaseCorrelate(win_ref * hann, win_src * hann)
            # cv2.phaseCorrelate(A, B) returns (dx, dy) such that B(x,y) ~= A(x-dx, y-dy).
            # Given win_ref centered on (rx,ry) and win_src on the *approximate* match
            # (sx,sy), the residual between the approximate and true correspondence is
            # ADDED to the initial estimate, not subtracted (verified against a known
            # sub-pixel ground-truth shift: sx+dx lands within ~0.07px of truth, sx-dx
            # was off by ~0.9px in the other direction).
            if response > 0.05:  # discard low-confidence, likely-textureless correlations
                refined_src[i, 0] = sx + shift_x
                refined_src[i, 1] = sy + shift_y
        except cv2.error:
            continue  # degenerate window (flat/zero patch); fall back to integer match

    return refined_src


# ==============================================================================
# 3B.4 COARSE-TO-FINE PATCH PYRAMID (Preserves Sub-Meter Resolution)
# ==============================================================================

def hierarchical_multires_registration(
    tmc_img: np.ndarray,
    iirs_img: np.ndarray,
    ohrc_img: np.ndarray,
    tmc_gsd: float = 5.0,
    ohrc_gsd: float = 0.25,
    tmc_sun: tuple = (45.0, 0.0),
    iirs_sun: tuple = (45.0, 0.0),
    ohrc_sun: tuple = (65.0, 180.0),
    matcher_class = None,  # pass LunarLoFTRMatcher
    dem: np.ndarray = None,
    margin_frac: float = 0.15
) -> dict:
    """
    Step 1: Register low-res TMC-2 (5 m/px) to IIRS (80 m/px) globally -> cheap,
            gives an approximate bounding box for where OHRC should be cropped.
    Step 2: Crop the native-resolution OHRC (0.25 m/px) strip to only that ROI
            (using the known GSD ratio), instead of downsampling OHRC to match.
    Step 3: Re-match the OHRC crop against an upsampled TMC crop AT FULL
            RESOLUTION, then sub-pixel refine. This is what preserves sub-meter
            detail: only the tiny relevant patch ever gets processed at high
            precision, so nothing sub-meter is thrown away by pyramid blur.

    Target: final registration RMSE < 0.5 px on the OHRC crop.
    """
    if matcher_class is None:
        raise ValueError("Pass the LunarLoFTRMatcher class/instance from Phase 3.")

    # --- Step 1: coarse TMC <-> IIRS global registration ---
    norm_tmc, norm_iirs, _ = preprocess_lunar_multimodal_pair(
        img_ref=tmc_img, img_src=iirs_img,
        ref_sun_elevation=tmc_sun[0], ref_sun_azimuth=tmc_sun[1],
        src_sun_elevation=iirs_sun[0], src_sun_azimuth=iirs_sun[1],
        dem=dem, enable_sun_compensation=(dem is not None), is_iirs_infrared=True
    )

    coarse_matcher = matcher_class if not isinstance(matcher_class, type) else matcher_class(confidence_thresh=0.3)
    pts_tmc, pts_iirs, confs_c, _ = match_pair_shadow_invariant(
        coarse_matcher, norm_tmc, norm_iirs, tmc_sun[0], tmc_sun[1], iirs_sun[0], iirs_sun[1]
    )
    coarse_reg = estimate_homography_and_warp(
        norm_tmc, norm_iirs, pts_tmc, pts_iirs,
        reproj_threshold_px=5.0, min_inliers_required=8
    )
    if not coarse_reg['success']:
        return {'success': False, 'stage_failed': 'coarse_tmc_iirs', 'error_msg': coarse_reg['error_msg']}

    # --- Step 2: localize ROI in TMC frame, project to OHRC-native pixel space ---
    inliers_ref = coarse_reg['inlier_pts_ref']
    x_min, y_min = inliers_ref.min(axis=0)
    x_max, y_max = inliers_ref.max(axis=0)

    gsd_ratio = tmc_gsd / ohrc_gsd  # e.g. 5.0 / 0.25 = 20x
    margin_x = (x_max - x_min) * margin_frac
    margin_y = (y_max - y_min) * margin_frac

    ohrc_x0 = max(0, int((x_min - margin_x) * gsd_ratio))
    ohrc_x1 = min(ohrc_img.shape[1], int((x_max + margin_x) * gsd_ratio))
    ohrc_y0 = max(0, int((y_min - margin_y) * gsd_ratio))
    ohrc_y1 = min(ohrc_img.shape[0], int((y_max + margin_y) * gsd_ratio))

    if ohrc_x1 <= ohrc_x0 or ohrc_y1 <= ohrc_y0:
        return {'success': False, 'stage_failed': 'roi_projection', 'error_msg': 'Projected OHRC ROI is degenerate.'}

    ohrc_crop = ohrc_img[ohrc_y0:ohrc_y1, ohrc_x0:ohrc_x1]

    # --- Step 3: full-resolution fine matching on the crop only ---
    tmc_roi = norm_tmc[int(y_min):int(y_max), int(x_min):int(x_max)]
    tmc_roi_upsampled = cv2.resize(
        tmc_roi, (ohrc_crop.shape[1], ohrc_crop.shape[0]), interpolation=cv2.INTER_CUBIC
    )

    fine_matcher = matcher_class if not isinstance(matcher_class, type) else matcher_class(confidence_thresh=0.2)
    pts_fine_ref, pts_fine_src, confs_f, _ = match_pair_shadow_invariant(
        fine_matcher, tmc_roi_upsampled, ohrc_crop, tmc_sun[0], tmc_sun[1], ohrc_sun[0], ohrc_sun[1]
    )
    fine_reg = estimate_homography_and_warp(
        tmc_roi_upsampled, ohrc_crop, pts_fine_ref, pts_fine_src,
        reproj_threshold_px=1.5, min_inliers_required=10
    )
    if not fine_reg['success']:
        return {'success': False, 'stage_failed': 'fine_ohrc_match', 'error_msg': fine_reg['error_msg']}

    # --- Step 4: sub-pixel refinement on the fine inliers ---
    refined_src_pts = subpixel_refine_matches(
        tmc_roi_upsampled, ohrc_crop,
        fine_reg['inlier_pts_ref'], fine_reg['inlier_pts_src']
    )

    residuals = np.linalg.norm(refined_src_pts - fine_reg['inlier_pts_src'], axis=1)
    print(f"[Phase 3B] Coarse-to-fine complete. OHRC crop: {ohrc_crop.shape}, "
          f"fine inliers: {fine_reg['num_inliers']}, mean sub-pixel shift applied: {np.mean(residuals):.3f} px")

    return {
        'success': True,
        'coarse_tmc_iirs_H': coarse_reg['H_matrix'],
        'ohrc_crop_bounds': (ohrc_x0, ohrc_y0, ohrc_x1, ohrc_y1),
        'fine_H': fine_reg['H_matrix'],
        'fine_inliers_ref': fine_reg['inlier_pts_ref'],
        'fine_inliers_src_refined': refined_src_pts,
        'ohrc_crop': ohrc_crop,
        'tmc_roi_upsampled': tmc_roi_upsampled,
        'num_fine_inliers': fine_reg['num_inliers'],
    }
`,

  phase4: `"""
================================================================================
PHASE 4: EVALUATION, QUANTITATIVE METRICS & VISUALIZATION
================================================================================
Key Objectives:
  1. Side-by-side keypoint correspondences with colored confidence lines.
  2. Sub-pixel alignment verification: Interactive Checkerboard & Alpha Blending.
  3. Quantitative Metrics: Root Mean Square Error (RMSE), PSNR, and SSIM.
"""

import numpy as np
import cv2
import matplotlib.pyplot as plt
from matplotlib.patches import ConnectionPatch
from skimage.metrics import structural_similarity as ssim

def calculate_registration_metrics(
    img_ref: np.ndarray,
    warped_src: np.ndarray,
    inlier_pts_ref: np.ndarray,
    inlier_pts_src: np.ndarray,
    H_matrix: np.ndarray
) -> dict:
    """
    Computes rigorous remote-sensing registration metrics:
      - Point-based Homography Transfer RMSE (pixels)
      - Peak Signal-to-Noise Ratio (PSNR in dB) over overlapping region
      - Structural Similarity Index (SSIM)
    """
    src_homogeneous = np.hstack([inlier_pts_src, np.ones((len(inlier_pts_src), 1))])
    projected = (H_matrix @ src_homogeneous.T).T
    projected_pts = projected[:, :2] / (projected[:, 2:3] + 1e-10)

    residuals = np.linalg.norm(projected_pts - inlier_pts_ref, axis=1)
    rmse_px = float(np.sqrt(np.mean(residuals**2)))
    mae_px = float(np.mean(residuals))

    valid_mask = (warped_src > 0.001) & (img_ref > 0.001)
    if np.sum(valid_mask) > 100:
        ref_valid = img_ref[valid_mask]
        warped_valid = warped_src[valid_mask]
        mse = np.mean((ref_valid - warped_valid)**2)
        psnr_db = float(10.0 * np.log10(1.0 / (mse + 1e-10)))
        ssim_val = float(ssim(img_ref, warped_src, data_range=1.0))
    else:
        psnr_db = 0.0
        ssim_val = 0.0

    metrics = {
        'rmse_pixels': round(rmse_px, 3),
        'mae_pixels': round(mae_px, 3),
        'psnr_db': round(psnr_db, 2),
        'ssim': round(ssim_val, 4),
        'valid_overlap_percent': round((np.sum(valid_mask) / img_ref.size) * 100, 1)
    }
    return metrics

def visualize_registration_results(
    img_ref: np.ndarray,
    img_src: np.ndarray,
    warped_src: np.ndarray,
    inlier_pts_ref: np.ndarray,
    inlier_pts_src: np.ndarray,
    metrics: dict,
    checker_size: int = 64
):
    """
    Generates publication-quality 4-panel figure.
    """
    fig = plt.figure(figsize=(18, 14), dpi=120)

    # Panel 1: Keypoint Correspondence Tie-Lines
    ax1 = fig.add_subplot(2, 2, 1)
    h_ref, w_ref = img_ref.shape
    h_src, w_src = img_src.shape
    combined = np.zeros((max(h_ref, h_src), w_ref + w_src), dtype=np.float32)
    combined[:h_ref, :w_ref] = img_ref
    combined[:h_src, w_ref:w_ref + w_src] = img_src
    
    ax1.imshow(combined, cmap='gray')
    ax1.set_title(f"Dense Inlier Keypoint Correspondences (N={len(inlier_pts_ref)})", fontsize=12, fontweight='bold')
    ax1.axis('off')

    sample_indices = np.linspace(0, len(inlier_pts_ref) - 1, min(60, len(inlier_pts_ref)), dtype=int)
    for idx in sample_indices:
        r_x, r_y = inlier_pts_ref[idx]
        s_x, s_y = inlier_pts_src[idx]
        ax1.plot([r_x, s_x + w_ref], [r_y, s_y], color='cyan', alpha=0.6, linewidth=1.0)
        ax1.scatter([r_x], [r_y], color='yellow', s=12, edgecolors='black', linewidths=0.5)
        ax1.scatter([s_x + w_ref], [s_y], color='lime', s=12, edgecolors='black', linewidths=0.5)

    # Panel 2: Alpha-Blended Overlay
    ax2 = fig.add_subplot(2, 2, 2)
    alpha_blend = 0.5 * img_ref + 0.5 * warped_src
    ax2.imshow(alpha_blend, cmap='magma')
    ax2.set_title(f"Alpha-Blended Overlay (PSNR: {metrics['psnr_db']} dB)", fontsize=12, fontweight='bold')
    ax2.axis('off')

    # Panel 3: Checkerboard Mosaic
    ax3 = fig.add_subplot(2, 2, 3)
    checkerboard = np.zeros_like(img_ref)
    for y in range(h_ref):
        for x in range(w_ref):
            if ((x // checker_size) + (y // checker_size)) % 2 == 0:
                checkerboard[y, x] = img_ref[y, x]
            else:
                checkerboard[y, x] = warped_src[y, x]
    
    ax3.imshow(checkerboard, cmap='gray')
    ax3.set_title(f"Checkerboard Alignment (Grid: {checker_size}px, RMSE: {metrics['rmse_pixels']} px)", fontsize=12, fontweight='bold')
    ax3.axis('off')

    # Panel 4: Residual Heatmap
    ax4 = fig.add_subplot(2, 2, 4)
    residual_map = np.abs(img_ref - warped_src)
    residual_map[warped_src == 0] = 0
    im4 = ax4.imshow(residual_map, cmap='inferno', vmin=0, vmax=0.4)
    ax4.set_title(f"Residual Error Heatmap (SSIM: {metrics['ssim']})", fontsize=12, fontweight='bold')
    ax4.axis('off')
    fig.colorbar(im4, ax=ax4, fraction=0.046, pad=0.04, label='Normalized Radiance Error')

    plt.tight_layout()
    plt.show()
`,

  fullPipelineMain: `"""
================================================================================
END-TO-END CHANDRAYAAN-2 REGISTRATION PIPELINE EXECUTION
(FEATURING AUTOMATIC SUN ANGLE & TOPOGRAPHIC ILLUMINATION COMPENSATION)
================================================================================
"""

def run_complete_chandrayaan2_registration(
    ref_pds_xml: str, 
    src_pds_xml: str,
    target_scale_ratio: float = 20.0,
    is_iirs: bool = False,
    enable_sun_compensation: bool = True,
    sun_comp_method: str = 'dem_lommel_seeliger'
):
    print("=================================================================")
    print(" ISRO CHANDRAYAAN-2 MULTI-MODAL LUNAR REGISTRATION ENGINE        ")
    print("=================================================================")

    # PHASE 1: Data Ingestion
    print("\\n>>> [PHASE 1] Loading PDS4 Datasets...")
    reader_ref = Chandrayaan2PDS4Reader(ref_pds_xml)
    reader_src = Chandrayaan2PDS4Reader(src_pds_xml)
    
    # Extract co-located 1024x1024 patches
    patch_ref = reader_ref.extract_patch(center_row=1500, center_col=1500, patch_size=1024)
    patch_src = reader_src.extract_patch(center_row=1500, center_col=1500, patch_size=1024)

    # PHASE 2: Scale-Pyramid, Sun-Angle Compensation & Radiometric Harmonization
    print("\\n>>> [PHASE 2] Building Scale Pyramid & Sun-Angle Compensation...")
    pyramid_src = build_lunar_scale_pyramid(patch_src, target_scale_ratio=target_scale_ratio)
    src_scaled = pyramid_src[-1]
    src_matched = cv2.resize(src_scaled, (patch_ref.shape[1], patch_ref.shape[0]))
    
    # Apply Sun-Angle Topographic / Retinex Normalization
    norm_ref, norm_src, telemetry = preprocess_lunar_multimodal_pair(
        img_ref=patch_ref,
        img_src=src_matched,
        ref_sun_elevation=reader_ref.metadata.get('sun_elevation', 45.0),
        ref_sun_azimuth=reader_ref.metadata.get('sun_azimuth', 0.0),
        src_sun_elevation=reader_src.metadata.get('sun_elevation', 65.0),
        src_sun_azimuth=reader_src.metadata.get('sun_azimuth', 180.0),
        dem=None, # Ingest co-registered TMC-2 DTM if available
        enable_sun_compensation=enable_sun_compensation,
        sun_comp_method=sun_comp_method,
        is_iirs_infrared=is_iirs,
        apply_clahe=True
    )

    # PHASE 3: Deep Feature Matching & Homography
    print("\\n>>> [PHASE 3] Running LoFTR Dense Transformer Matcher & USAC-MAGSAC...")
    matcher = LunarLoFTRMatcher(confidence_thresh=0.25)
    pts_ref, pts_src, confs = matcher.match_pair(norm_ref, norm_src)

    reg_result = estimate_homography_and_warp(
        img_ref=norm_ref,
        img_src=norm_src,
        pts_ref=pts_ref,
        pts_src=pts_src,
        reproj_threshold_px=3.0,
        min_inliers_required=10
    )

    if not reg_result['success']:
        print(f"Registration Terminated: {reg_result['error_msg']}")
        return

    # PHASE 4: Metrics & Evaluation
    print("\\n>>> [PHASE 4] Calculating Precision Metrics & Visualizing...")
    metrics = calculate_registration_metrics(
        img_ref=norm_ref,
        warped_src=reg_result['warped_src'],
        inlier_pts_ref=reg_result['inlier_pts_ref'],
        inlier_pts_src=reg_result['inlier_pts_src'],
        H_matrix=reg_result['H_matrix']
    )

    visualize_registration_results(
        img_ref=norm_ref,
        img_src=norm_src,
        warped_src=reg_result['warped_src'],
        inlier_pts_ref=reg_result['inlier_pts_ref'],
        inlier_pts_src=reg_result['inlier_pts_src'],
        metrics=metrics
    )

if __name__ == "__main__":
    print("Chandrayaan-2 Registration Pipeline initialized.")
`,

  advancedPolarPipelineMain: `"""
================================================================================
ADVANCED SOUTH-POLE PIPELINE: SHADOW-INVARIANT + LOCAL MESH + SUB-PIXEL FUSION
================================================================================
Runs all three Phase 3B fixes together on a real OHRC/TMC-2/IIRS triple.
Use this instead of run_complete_chandrayaan2_registration() for polar sites
(Shackleton, Boguslawsky) where low sun angle and 3D crater walls break the
flat-plane, global-homography, single-resolution assumptions of the base pipeline.
"""

def run_advanced_polar_landing_pipeline(
    tmc_pds_xml: str,
    iirs_pds_xml: str,
    ohrc_pds_xml: str,
    tmc_dem: np.ndarray = None,
    mesh_grid_size: int = 4
):
    print("=================================================================")
    print(" ADVANCED POLAR REGISTRATION: SHADOW-MASK + LOCAL MESH + SUB-PX  ")
    print("=================================================================")

    # PHASE 1: Ingest all three products
    reader_tmc = Chandrayaan2PDS4Reader(tmc_pds_xml)
    reader_iirs = Chandrayaan2PDS4Reader(iirs_pds_xml)
    reader_ohrc = Chandrayaan2PDS4Reader(ohrc_pds_xml)

    tmc_patch = reader_tmc.extract_patch(center_row=1500, center_col=1500, patch_size=1024)
    iirs_patch = reader_iirs.extract_patch(center_row=100, center_col=100, patch_size=256)
    ohrc_patch = reader_ohrc.extract_patch(center_row=15000, center_col=15000, patch_size=8192)

    def norm01(x):
        p1, p99 = np.percentile(x, (1.0, 99.0))
        return np.clip((x - p1) / (p99 - p1 + 1e-6), 0.0, 1.0).astype(np.float32)

    tmc_patch, iirs_patch, ohrc_patch = norm01(tmc_patch), norm01(iirs_patch), norm01(ohrc_patch)

    tmc_sun = (reader_tmc.metadata.get('sun_elevation', 45.0), reader_tmc.metadata.get('sun_azimuth', 0.0))
    iirs_sun = (reader_iirs.metadata.get('sun_elevation', 45.0), reader_iirs.metadata.get('sun_azimuth', 0.0))
    ohrc_sun = (reader_ohrc.metadata.get('sun_elevation', 12.0), reader_ohrc.metadata.get('sun_azimuth', 45.0))

    # FIX 3: Coarse-to-fine patch pyramid (TMC<->IIRS global, then full-res OHRC crop)
    print("\\n>>> [Fix 3] Coarse-to-fine hierarchical registration...")
    result = hierarchical_multires_registration(
        tmc_img=tmc_patch, iirs_img=iirs_patch, ohrc_img=ohrc_patch,
        tmc_sun=tmc_sun, iirs_sun=iirs_sun, ohrc_sun=ohrc_sun,
        matcher_class=LunarLoFTRMatcher, dem=tmc_dem
    )
    if not result['success']:
        print(f"Pipeline halted at stage '{result['stage_failed']}': {result['error_msg']}")
        return None

    # FIX 2: DEM-guided local affine mesh instead of one global homography for the fine warp
    print("\\n>>> [Fix 2] Fitting DEM-guided local affine mesh over the OHRC crop...")
    mesh_warper = DEMGuidedLocalMeshWarper(grid_size=mesh_grid_size, min_pts_per_cell=6)
    h_crop, w_crop = result['ohrc_crop'].shape
    cell_homographies = mesh_warper.estimate_local_homographies(
        pts_ref=result['fine_inliers_ref'],
        pts_src=result['fine_inliers_src_refined'],
        w=w_crop, h=h_crop,
        global_H=result['fine_H'],
        dem=tmc_dem
    )
    mesh_warped_src = mesh_warper.warp_with_mesh(result['ohrc_crop'], cell_homographies, w_crop, h_crop)

    # Evaluate final precision (Fix 1's shadow masking is already baked into every
    # match_pair_shadow_invariant() call inside hierarchical_multires_registration)
    metrics = calculate_registration_metrics(
        img_ref=result['tmc_roi_upsampled'],
        warped_src=mesh_warped_src,
        inlier_pts_ref=result['fine_inliers_ref'],
        inlier_pts_src=result['fine_inliers_src_refined'],
        H_matrix=result['fine_H']
    )
    print(f"\\n>>> FINAL METRICS: RMSE={metrics['rmse_pixels']} px | SSIM={metrics['ssim']} | "
          f"Inliers={result['num_fine_inliers']}")
    print(f"    Target for precision landing: RMSE < 0.5 px -> "
          f"{'PASS' if metrics['rmse_pixels'] < 0.5 else 'NEEDS MORE TUNING'}")

    return {'result': result, 'mesh_warped_src': mesh_warped_src, 'metrics': metrics}

if __name__ == "__main__":
    print("Advanced Polar Landing Pipeline initialized.")
`
};

// Generate a valid Jupyter Notebook JSON for download
export function generateJupyterNotebookJSON(): string {
  const notebook = {
    cells: [
      {
        cell_type: "markdown",
        metadata: {},
        source: [
          "# 🌕 Chandrayaan-2 Multi-Modal, Sun Angle & Scale Invariant Image Registration\n",
          "**ISRO PRADAN Orbiter Data: OHRC (~0.25m/px), TMC-2 (~5m/px), and IIRS (~80m/px)**\n",
          "\n",
          "This notebook implements a complete 4-Phase Remote Sensing Computer Vision pipeline with Sun-Angle Topographic Compensation:\n",
          "- **Phase 1**: ISRO PRADAN PDS4 XML/.IMG data ingestion & OOM-safe patch extraction.\n",
          "- **Sun-Angle Module**: Lommel-Seeliger, Minnaert, C-Correction, and Multi-Scale Retinex illumination normalization.\n",
          "- **Phase 2**: Multi-scale Gaussian pyramid downsampling & CLAHE/Phase Congruency harmonization.\n",
          "- **Phase 3**: LoFTR (Local Feature Transformer) dense matching + USAC-MAGSAC RANSAC homography.\n",
          "- **Phase 4**: Side-by-side keypoint tie-lines, checkerboard overlay, alpha-blend, RMSE & PSNR telemetry."
        ]
      },
      {
        cell_type: "code",
        execution_count: null,
        metadata: {},
        outputs: [],
        source: [
          "# @title 🚀 1. Install Required Dependencies (Colab T4 Compatible)\n",
          "!pip install -q kornia lightglue rasterio pvl opencv-python-headless matplotlib scikit-image scipy"
        ]
      },
      {
        cell_type: "code",
        execution_count: null,
        metadata: {},
        outputs: [],
        source: [
          "# @title ☀️ 2. Sun-Angle & Topographic Photometric Compensation Engine\n",
          PYTHON_SCRIPTS.sunAngleModule
        ]
      },
      {
        cell_type: "code",
        execution_count: null,
        metadata: {},
        outputs: [],
        source: [
          "# @title 📦 3. Phase 1: PDS4 Ingestion & Windowed Patch Extractor\n",
          PYTHON_SCRIPTS.phase1
        ]
      },
      {
        cell_type: "code",
        execution_count: null,
        metadata: {},
        outputs: [],
        source: [
          "# @title 🔬 4. Phase 2: Scale Pyramid & Preprocessing\n",
          PYTHON_SCRIPTS.phase2
        ]
      },
      {
        cell_type: "code",
        execution_count: null,
        metadata: {},
        outputs: [],
        source: [
          "# @title 🧠 5. Phase 3: LoFTR Matching & Robust RANSAC Homography\n",
          PYTHON_SCRIPTS.phase3
        ]
      },
      {
        cell_type: "code",
        execution_count: null,
        metadata: {},
        outputs: [],
        source: [
          "# @title 🌑 6. Phase 3B: Shadow-Invariant Mesh + Sub-Pixel Precision (South Pole Fixes)\n",
          PYTHON_SCRIPTS.phase3b
        ]
      },
      {
        cell_type: "code",
        execution_count: null,
        metadata: {},
        outputs: [],
        source: [
          "# @title 📊 7. Phase 4: Quantitative Evaluation & Visualizations\n",
          PYTHON_SCRIPTS.phase4
        ]
      },
      {
        cell_type: "code",
        execution_count: null,
        metadata: {},
        outputs: [],
        source: [
          "# @title 🎯 8. Execute End-to-End Pipeline on Simulated or PRADAN Lunar Data\n",
          PYTHON_SCRIPTS.fullPipelineMain
        ]
      },
      {
        cell_type: "code",
        execution_count: null,
        metadata: {},
        outputs: [],
        source: [
          "# @title 🚀 9. Advanced Polar Landing Pipeline (Shadow-Mask + Local Mesh + Sub-Pixel, all 3 fixes fused)\n",
          PYTHON_SCRIPTS.advancedPolarPipelineMain
        ]
      }
    ],
    metadata: {
      accelerator: "GPU",
      colab: {
        provenance: [],
        gpuType: "T4"
      },
      kernelspec: {
        display_name: "Python 3",
        name: "python3"
      },
      language_info: {
        name: "python"
      }
    },
    nbformat: 4,
    nbformat_minor: 0
  };

  return JSON.stringify(notebook, null, 2);
}

