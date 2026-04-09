FROM python:3.10-slim
WORKDIR /app
COPY . /app
RUN pip install --no-cache-dir opencv-python torch torchvision numpy matplotlib
CMD ["python", "entry.py"]
