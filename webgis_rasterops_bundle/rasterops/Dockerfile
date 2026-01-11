# 基于指定的GDAL镜像构建
FROM ghcr.io/osgeo/gdal:ubuntu-small-3.10.1

# 1. 安装系统级依赖（仅保留apt能识别的系统包，移除fastapi和uvicorn）
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       python3 python3-pip python3-venv ca-certificates \
    && rm -rf /var/lib/apt/lists/*  # 清理apt缓存，减小镜像体积

# 2. 创建Python虚拟环境（路径/opt/venv，规范且不污染工作目录）
RUN python3 -m venv --system-site-packages /opt/venv

# 3. 激活虚拟环境并安装Python第三方库
# 关键：Docker中RUN命令无法直接使用source激活环境，需直接调用虚拟环境内的pip可执行文件

RUN /opt/venv/bin/pip3 install --no-cache-dir fastapi uvicorn numpy pydantic requests python-multipart

# （可选优化）添加国内PyPI镜像源加快安装（若网络缓慢）
# RUN /opt/venv/bin/pip3 install --no-cache-dir -i https://pypi.tuna.tsinghua.edu.cn/simple fastapi uvicorn

# 4. 后续配置（示例：复制应用、暴露端口、启动命令，需调用虚拟环境内的uvicorn）
WORKDIR /app
COPY ./app /app  
EXPOSE 9001

# 启动命令：调用虚拟环境内的uvicorn可执行文件，避免全局环境冲突
CMD ["/opt/venv/bin/uvicorn", "main:app", "--host", "0.0.0.0", "--port", "9001"]