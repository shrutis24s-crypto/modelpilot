FROM python:3.10-slim
WORKDIR /app
COPY . /app
RUN pip install --no-cache-dir transformers torch numpy pandas
CMD ["python", "entry.py"]
