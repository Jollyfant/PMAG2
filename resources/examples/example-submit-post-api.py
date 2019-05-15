import requests

# HTTPS API
URL = "https://api.paleomagnetism.org/"

# Required metadata to be submitted
required_fields = {
  "author": "author",
  "institution": "institution",
  "description": "description"
}

# Create a list of collections to submit
collection_files = {
  "upload": ("collecion_name", open("specimens.dir", "rb"))
}

requests.post(URL, data=required_fields, files=collection_files)
