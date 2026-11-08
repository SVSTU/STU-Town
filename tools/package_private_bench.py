"""Package reusable GLBs and editable Blender sources. No deployment or account data."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'design/private-bench-assets-v1.zip'
folders=['client/assets/3d/private-bench-v1','client/assets/3d/characters/private-garden-v1','source-assets/private-bench-v1']
files=set()
for folder in folders:
    for file in (ROOT/folder).rglob('*'):
        if file.is_file() and file.suffix not in ['.blend1','.log'] and 'references' not in file.relative_to(ROOT/folder).parts:
            files.add(file)
for file in ['source-assets/characters/student-male-01.blend','tools/build_private_bench.py','tools/assemble_private_bench.py','tools/asset_modeling.py']:
    files.add(ROOT/file)
OUT.parent.mkdir(exist_ok=True)
with ZipFile(OUT,'x',ZIP_DEFLATED,compresslevel=6) as archive:
    for file in sorted(files):archive.write(file,file.relative_to(ROOT).as_posix())
    archive.writestr('ASSET-PACK.md','''# Asset vườn ghế riêng

10 GLB cảnh quan, 2 GLB nhân vật, nguồn Blender, layout và ảnh kiểm chứng.
Giải nén theo cấu trúc thư mục tại gốc dự án STU-Town. Đây là gói asset,
không phải toàn bộ ứng dụng hoặc bộ cài server. Các trang viewer dùng các
module JavaScript chung trong repo và cần chạy qua HTTP.

Nguồn: source-assets/private-bench-v1/README.md.
Ảnh tham chiếu AI giữ riêng trong thư mục references của repo, không nhân đôi
trong gói này. Ảnh previews là render/chụp từ mô hình thật.
Khung cổng là GLB; shader xoáy hoạt động trong map Babylon đã tích hợp.
''')
with ZipFile(OUT) as archive:
    assert archive.testzip() is None
    models=[n for n in archive.namelist() if n.endswith('.glb')]
    assert len(models)==12
print('PACKAGED',OUT,'GLBs',len(models),'bytes',OUT.stat().st_size,flush=True)
