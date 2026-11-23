"""Export COLMAP camera poses (TXT model) to a three.js-friendly JSON path.

Coordinates are converted by a 180deg rotation about X (y and z negated), which
matches rotating the splat by quaternion (1,0,0,0) in the viewer.

usage: python export_cameras.py <colmap_txt_dir> <out.json>
"""
import json
import math
import sys


def quat_to_mat(w, x, y, z):
    return [
        [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
        [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
        [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)],
    ]


def mat_to_quat(m):
    tr = m[0][0] + m[1][1] + m[2][2]
    if tr > 0:
        s = math.sqrt(tr + 1.0) * 2
        return [(m[2][1] - m[1][2]) / s, (m[0][2] - m[2][0]) / s, (m[1][0] - m[0][1]) / s, 0.25 * s]
    if m[0][0] > m[1][1] and m[0][0] > m[2][2]:
        s = math.sqrt(1.0 + m[0][0] - m[1][1] - m[2][2]) * 2
        return [0.25 * s, (m[0][1] + m[1][0]) / s, (m[0][2] + m[2][0]) / s, (m[2][1] - m[1][2]) / s]
    if m[1][1] > m[2][2]:
        s = math.sqrt(1.0 + m[1][1] - m[0][0] - m[2][2]) * 2
        return [(m[0][1] + m[1][0]) / s, 0.25 * s, (m[1][2] + m[2][1]) / s, (m[0][2] - m[2][0]) / s]
    s = math.sqrt(1.0 + m[2][2] - m[0][0] - m[1][1]) * 2
    return [(m[0][2] + m[2][0]) / s, (m[1][2] + m[2][1]) / s, 0.25 * s, (m[1][0] - m[0][1]) / s]


def main(txt_dir, out_path):
    cam_line = [l for l in open(f"{txt_dir}/cameras.txt") if not l.startswith("#")][0].split()
    height, fy = float(cam_line[3]), float(cam_line[5])
    fov_y = math.degrees(2 * math.atan(height / 2 / fy))

    lines = [l for l in open(f"{txt_dir}/images.txt") if not l.startswith("#")][::2]
    cams = []
    for line in lines:
        p = line.split()
        r = quat_to_mat(*map(float, p[1:5]))  # world -> camera
        t = list(map(float, p[5:8]))
        center = [-sum(r[j][i] * t[j] for j in range(3)) for i in range(3)]
        # camera axes in COLMAP world (rows of R): right, down, forward
        right, down, fwd = r[0], r[1], r[2]
        flip = lambda v: [v[0], -v[1], -v[2]]
        x = flip(right)
        y = [-c for c in flip(down)]
        z = [-c for c in flip(fwd)]
        m = [[x[i], y[i], z[i]] for i in range(3)]
        cams.append({"name": p[9], "position": flip(center), "quaternion": mat_to_quat(m)})
    cams.sort(key=lambda c: c["name"])
    json.dump({"fovY": fov_y, "cameras": cams}, open(out_path, "w"), indent=1)
    print(f"wrote {len(cams)} cameras, fovY={fov_y:.1f}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
