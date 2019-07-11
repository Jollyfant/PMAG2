import requests

# HTTPS API
URL = "https://api.paleomagnetism.org/"

# Required metadata to be submitted
required_fields = {
  "author": "author",
  "institution": "institution",
  "description": "description",
  "name": "name",
  "doi": "OKE"
}

# Create a list of collections to submit
collection_files = [ 
  ("collecion_name", open("/Users/Mathijs/Downloads/specimens-4.dir", "rb"))
]

print requests.post(URL, data=required_fields, files=collection_files).text
