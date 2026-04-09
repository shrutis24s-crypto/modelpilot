FROM tensorflow/tensorflow:2.13.0-gpu
WORKDIR /app
COPY . /app
RUN pip install --no-cache-dir numpy pandas
CMD ["python", "entry.py"]
