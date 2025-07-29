FROM python:3.10

WORKDIR /app
COPY . .
RUN pip install --upgrade pip && pip install -r requirements.txt

EXPOSE 8001
CMD ["python", "run_api.py"]
