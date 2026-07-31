import os
import subprocess
import shutil
import datetime
import json
import re


CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.json")

CN_DIGITS = {"零": 0, "一": 1, "二": 2, "三": 3, "四": 4,
             "五": 5, "六": 6, "七": 7, "八": 8, "九": 9}


def parse_cn_number(s):
    """将中文数字（如"二十三"）转换为整数"""
    s = s.strip()
    if not s:
        return 0
    if "十" not in s:
        if len(s) == 1 and s in CN_DIGITS:
            return CN_DIGITS[s]
        if s.startswith("十"):
            return 10 + parse_cn_number(s[1:])
        result = 0
        for c in s:
            if c in CN_DIGITS:
                result = result * 10 + CN_DIGITS[c]
        return result
    parts = s.split("十", 1)
    before, after = parts[0], parts[1]
    before_val = CN_DIGITS.get(before, 0) if before else 1
    after_val = parse_cn_number(after) if after else 0
    return before_val * 10 + after_val


def parse_cn_or_digit(s):
    """中文数字或阿拉伯数字段均解析为整数（如"十四"→14，"14"→14）"""
    s = s.strip()
    if not s:
        return 0
    if s.isdigit():
        return int(s)
    return parse_cn_number(s)


def parse_time(text):
    """将"十四点三十分"/"14点30分"格式转为"14:30"格式"""
    text = text.strip()
    if "点" in text:
        parts = text.split("点", 1)
        hour = parse_cn_or_digit(parts[0]) if parts[0] else 0
        minute_text = parts[1] if len(parts) > 1 else ""
        minute_text = minute_text.replace("分", "").replace("分钟", "")
        minute = parse_cn_or_digit(minute_text)
        return f"{hour:02d}:{minute:02d}"
    return text


def load_config():
    """读取 config.json 配置文件"""
    if not os.path.exists(CONFIG_FILE):
        raise FileNotFoundError(f"找不到配置文件: {CONFIG_FILE}")
    with open(CONFIG_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def get_duration(filepath):
    """通过 ffprobe 获取音视频时长，返回 MM:SS 格式字符串"""
    try:
        result = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", filepath],
            capture_output=True, text=True
        )
        if result.returncode != 0:
            return "??:??"
        secs = float(result.stdout.strip())
    except (ValueError, OSError):
        return "??:??"
    m, s = divmod(int(secs), 60)
    return f"{m:02d}:{s:02d}"


def find_mp4_files(videos_dir):
    """扫描 videos_dir，返回所有 .mp4 文件排序后的列表"""
    if not os.path.isdir(videos_dir):
        print(f"  videos 目录不存在，跳过: {videos_dir}")
        return []
    try:
        files = [f for f in os.listdir(videos_dir) if f.lower().endswith(".mp4")]
    except OSError as e:
        print(f"  无法读取目录 {videos_dir}: {e}")
        return []
    files.sort()
    return files


def convert_to_ogg(mp4_files, videos_dir):
    """调用 ffmpeg 将 mp4 文件逐一声道转为 ogg（libvorbis），返回成功转换的文件名列表"""
    converted = []
    for i, mp4 in enumerate(mp4_files, 1):
        name = os.path.splitext(mp4)[0]
        ogg_name = name + ".ogg"
        src = os.path.join(videos_dir, mp4)
        dst = os.path.join(videos_dir, ogg_name)
        if os.path.exists(dst):
            print(f"  注意: {ogg_name} 已存在，将覆盖")
        print(f"[{i}/{len(mp4_files)}] 转换中: {mp4} -> {ogg_name}")
        result = subprocess.run(
            ["ffmpeg", "-y", "-i", src, "-vn", "-acodec", "libvorbis", dst],
            capture_output=True,
        )
        if result.returncode != 0:
            print(f"  转换失败: {result.stderr.decode('utf-8', errors='replace')}")
            continue
        converted.append(ogg_name)
        print(f"  转换完成")
    return converted


def delete_mp4(mp4_files, videos_dir, converted):
    """逐个删除已成功转换的 mp4 源文件（转换失败的保留，避免数据丢失）"""
    converted_names = {os.path.splitext(ogg)[0] for ogg in converted}
    for mp4 in mp4_files:
        if os.path.splitext(mp4)[0] not in converted_names:
            print(f"跳过（转换失败，保留）: {mp4}")
            continue
        path = os.path.join(videos_dir, mp4)
        os.remove(path)
        print(f"已删除: {mp4}")


def move_ogg(ogg_files, videos_dir, sounds_dir):
    """将 ogg 文件从 videos_dir 移动到 sounds 目录"""
    for ogg in ogg_files:
        src = os.path.join(videos_dir, ogg)
        dst = os.path.join(sounds_dir, ogg)
        shutil.move(src, dst)
        print(f"已移动: {ogg} -> sounds/")


def get_date_info(ogg_files, year, month):
    """逐一询问用户每个 ogg 的日期和时间，返回 (完整日期字符串, 文件名) 列表"""
    entries = []
    for ogg in ogg_files:
        print(f"\n--- 为文件设置日期: {ogg} ---")
        while True:
            day = input("请输入日 (如 17): ").strip()
            try:
                valid_day = int(day)
                datetime.date(year, month, valid_day)
                break
            except ValueError:
                print("  日期无效，请重新输入")
        while True:
            raw = input("请输入时间 (如 14:30): ").strip()
            time_str = parse_time(raw)
            try:
                h, m = time_str.split(":")
                h, m = int(h), int(m)
                if 0 <= h <= 23 and 0 <= m <= 59:
                    break
                print("  时间无效（小时0-23，分钟0-59），请重新输入")
            except ValueError:
                print("  时间格式无效，请重新输入")
        weekday_full = ["星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"][datetime.date(year, month, valid_day).weekday()]
        date_str = f"{year}年{month}月{day}日 {weekday_full} {time_str}"
        entries.append((date_str, ogg))
        print(f"  已记录: {date_str} -> sounds/{ogg}")
    return entries


def rename_ogg(entries, sounds_dir):
    """将 ogg 文件重命名为 yyyy-mm-dd_hh-mm.ogg 格式（依据录入日期），重名追加 -2/-3 后缀，返回更新后的 (日期, 新文件名) 列表"""
    renamed = []
    used = set()
    for date_str, ogg in entries:
        m = re.match(r"(\d{4})年(\d{1,2})月(\d{1,2})日\s+\S+\s+(\d{1,2}):(\d{2})", date_str)
        if not m:
            print(f"  跳过（无法解析日期）: {ogg}")
            renamed.append((date_str, ogg))
            continue
        y, mo, d, h, mi = (int(x) for x in m.groups())
        base = f"{y:04d}-{mo:02d}-{d:02d}_{h:02d}-{mi:02d}"
        new_name = base + ".ogg"
        n = 2
        while new_name in used:
            new_name = f"{base}-{n}.ogg"
            n += 1
        used.add(new_name)
        src = os.path.join(sounds_dir, ogg)
        dst = os.path.join(sounds_dir, new_name)
        if os.path.exists(src):
            os.rename(src, dst)
            print(f"  已重命名: {ogg} -> {new_name}")
            renamed.append((date_str, new_name))
        else:
            print(f"  文件不存在，跳过: {ogg}")
            renamed.append((date_str, ogg))
    return renamed


def edit_js(entries, js_file):
    """将新记录以 JS 数组元素格式插入 audioDataList 末尾；写入后跑 node --check 校验，失败自动回滚"""
    with open(js_file, "r", encoding="utf-8") as f:
        content = f.read()

    # 以 const audioDataList 为锚点，取其后的第一个 "];" 作为插入点（避免误匹配文件顶部其他数组）
    anchor = content.find("audioDataList")
    if anchor == -1:
        print(f"  main.js 中找不到 audioDataList，跳过编辑")
        return
    end_marker = content.find("];", anchor)
    if end_marker == -1:
        print(f"  main.js 中找不到数组结尾，跳过编辑")
        return

    new_lines = []
    for date_str, ogg in entries:
        line = f'    {{ date: "{date_str}", src: "sounds/{ogg}" }},'
        new_lines.append(line)

    insert_text = "\n".join(new_lines) + "\n"
    new_content = content[:end_marker] + insert_text + content[end_marker:]

    # 先写临时文件校验语法，通过后再覆盖原文件（须为 .js 后缀，node --check 才能识别）
    tmp_file = js_file + ".tmp.js"
    with open(tmp_file, "w", encoding="utf-8") as f:
        f.write(new_content)
    check = subprocess.run(["node", "--check", tmp_file], capture_output=True)
    if check.returncode != 0:
        os.remove(tmp_file)
        print(f"  node --check 失败，已回滚，未写入: {check.stderr.decode('utf-8', errors='replace')}")
        return

    os.replace(tmp_file, js_file)
    print(f"\n已更新 main.js，新增 {len(entries)} 条记录")


def git_deploy(sounds_dir, git_cfg):
    """按 config.json 中的 git.commands 依次执行 git 命令完成部署"""
    git_dir = os.path.dirname(sounds_dir)
    commands = git_cfg.get("commands", [])
    if not commands:
        print("  config.json 中未配置 git.commands，跳过部署")
        return
    for item in commands:
        cmd = item.get("cmd", "")
        desc = item.get("desc", "")
        if not cmd:
            continue
        print(f"\n执行: {cmd}")
        result = subprocess.run(cmd, shell=True, capture_output=True, cwd=git_dir)
        if result.returncode != 0:
            print(f"  {desc} 失败: {result.stderr.decode('utf-8', errors='replace')}")
        else:
            output = result.stdout.decode("utf-8", errors="replace").strip()
            if output:
                print(f"  {output}")
            print(f"  {desc} 完成")


def main():
    """主流程：读取配置 → 查找 MP4 → 显示文件及时长 → 转 OGG → 删源文件 → 移动 → 输入日期 → 重命名为 yyyy-mm-dd_hh-mm → 更新 JS → Git 部署"""
    config = load_config()

    required = ["videos_dir", "sounds_dir", "year", "month", "js_file"]
    for key in required:
        if key not in config:
            print(f"config.json 缺少必填字段: {key}")
            return

    videos_dir = config["videos_dir"]
    sounds_dir = config["sounds_dir"]
    js_file = config["js_file"]
    year = config["year"]
    month = config["month"]
    git_cfg = config.get("git", {})

    print("=" * 50)
    print("声界域音频转换及修改提交工具")
    print("=" * 50)

    mp4_files = find_mp4_files(videos_dir)

    if not mp4_files:
        print("Desktop 文件夹中没有找到 mp4 文件，跳过转换步骤")
    else:
        print(f"\n找到 {len(mp4_files)} 个 mp4 文件:")
        for f in mp4_files:
            fpath = os.path.join(videos_dir, f)
            dur = get_duration(fpath)
            print(f"  - {f} ({dur})")

        print(f"\n{'=' * 50}")
        print("步骤1: 转换 mp4 为 ogg")
        converted = convert_to_ogg(mp4_files, videos_dir)
        if not converted:
            print("没有文件成功转换，退出")
            return

        print(f"\n{'=' * 50}")
        print("步骤2: 删除 mp4 文件")
        delete_mp4(mp4_files, videos_dir, converted)

        print(f"\n{'=' * 50}")
        print("步骤3: 移动 ogg 到 sounds 目录")
        move_ogg(converted, videos_dir, sounds_dir)

        print(f"\n{'=' * 50}")
        print("步骤4: 输入日期信息")
        entries = get_date_info(converted, year, month)

        print(f"\n{'=' * 50}")
        print("步骤5: 重命名 ogg 文件为 yyyy-mm-dd_hh-mm 格式")
        entries = rename_ogg(entries, sounds_dir)

        print(f"\n{'=' * 50}")
        print("步骤6: 编辑 main.js")
        edit_js(entries, js_file)

    print(f"\n{'=' * 50}")
    print("步骤7: Git 部署")
    git_deploy(sounds_dir, git_cfg)

    print(f"\n{'=' * 50}")
    print("全部完成!")
    input("\n按任意键退出...")


if __name__ == "__main__":
    main()
