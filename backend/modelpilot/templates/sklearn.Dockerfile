FROM python:3.10-slim
WORKDIR /app
COPY . /app
RUN pip install --no-cache-dir numpy pandas scikit-learn
CMD ["python", "entry.py"]
