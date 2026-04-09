FROM python:3.10-slim
WORKDIR /app
COPY . /app
RUN apt-get update && apt-get install -y build-essential
RUN pip install --no-cache-dir numpy pandas scikit-learn lightgbm
CMD ["python", "entry.py"]
