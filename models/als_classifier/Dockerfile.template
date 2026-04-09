FROM nvidia/cuda:12.1.0-runtime-ubuntu22.04
WORKDIR /app
RUN apt-get update && apt-get install -y python3 python3-pip
COPY . /app
RUN pip3 install --no-cache-dir torch torchvision numpy pandas scikit-learn nibabel simpleitk matplotlib
CMD ["python3", "entry.py"]
