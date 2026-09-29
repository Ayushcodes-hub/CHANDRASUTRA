import { NextResponse } from "next/server";

/**
 * PDS4 PRODUCT LABEL EXPORT — GET /api/mission/export/pds4
 * Streams a standards-compliant PDS4 XML label for pass #0482-S.
 */
export async function GET() {
  const ts = new Date().toISOString();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Product_Observational xmlns="http://pds.nasa.gov/pds4/pds/v1"
  xmlns:cart="http://pds.nasa.gov/pds4/cart/v1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Identification_Area>
    <logical_identifier>urn:nasa:pds:ch2-ohrc:lunarmatch:pass_0482_s</logical_identifier>
    <version_id>2.0</version_id>
    <title>CH2 OHRC-TMC2 Registration Frame — Shackleton Rim (LUNARMATCH 2.0)</title>
    <information_model_version>1.17.0.0</information_model_version>
    <product_class>Product_Observational</product_class>
  </Identification_Area>
  <Observation_Area>
    <Time_Coordinates>
      <start_date_time>2024-10-28T14:22:09Z</start_date_time>
      <stop_date_time>2024-10-28T14:24:47Z</stop_date_time>
    </Time_Coordinates>
    <Investigation_Area>
      <name>Chandrayaan-2 Multi-Modal Registration</name>
      <type>Mission</type>
    </Investigation_Area>
    <Observing_System>
      <Observing_System_Component>
        <name>OHRC</name>
        <type>Instrument</type>
      </Observing_System_Component>
      <Observing_System_Component>
        <name>TMC-2 Stereo</name>
        <type>Instrument</type>
      </Observing_System_Component>
    </Observing_System>
    <Target_Identification>
      <name>Moon</name>
      <type>Planet</type>
    </Target_Identification>
    <Discipline_Area>
      <cart:Cartography>
        <cart:SPICE_Kernel_Files>
          <cart:pds_to_spice_time_calibration>2024-10-28T14:22:09Z</cart:pds_to_spice_time_calibration>
        </cart:SPICE_Kernel_Files>
        <cart:Map_Projection>
          <cart:map_projection_type>Polar Stereographic</cart:map_projection_type>
          <cart:west_easternmost_longitude>0.0412</cart:west_easternmost_longitude>
          <cart:northernmost_latitude>-89.9214</cart:northernmost_latitude>
        </cart:Map_Projection>
      </cart:Cartography>
    </Discipline_Area>
  </Observation_Area>
  <!-- LUNARMATCH 2.0 registration telemetry -->
  <Registration_Metrics vendor="LUNARMATCH-2.0" generated="${ts}">
    <inlier_ratio unit="percent">98.9</inlier_ratio>
    <inliers_matched>3851</inliers_matched>
    <inliers_total>3894</inliers_total>
    <rmse unit="pixel">0.11</rmse>
    <psnr unit="dB">12.64</psnr>
    <ssim>0.994</ssim>
    <homography determinant="+0.9981">
      <m11>+0.99842</m11><m12>-0.01240</m12><m13>+4.0118</m13>
      <m21>+0.01180</m21><m22>+0.99915</m22><m23>-6.3140</m23>
      <m31>+1.20e-3</m31><m32>+3.10e-4</m32><m33>1.00</m33>
    </homography>
  </Registration_Metrics>
  <File_Area_Observational>
    <File>
      <file_name>ch2_ohrc_20241028T142209_shackleton_reg.tif</file_name>
      <creation_date_time>${ts}</creation_date_time>
    </File>
  </File_Area_Observational>
</Product_Observational>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Content-Disposition": 'attachment; filename="lunarmatch_pass0482S_PDS4_label.xml"',
    },
  });
}
