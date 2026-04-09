FROM python:3.10-slim
WORKDIR /app
COPY . /app
RUN pip install --no-cache-dir pandas numpy scikit-learn xgboost lightgbm
CMD ["python", "entry.py"]
