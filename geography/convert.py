import json

def parseFrame(frame):

  d = []

  for i, (age, lat, lng, a95) in enumerate(zip(frame["age"], frame["plat"], frame["plong"], frame["A95"])):

    euler = {}

    for plate in frame["plates"]:
      try:
        euler[plate] = {
          "name": plate,
          "rot": frame["plates"][plate]["rot"][i],
          "lat": frame["plates"][plate]["lat"][i],
          "lng": frame["plates"][plate]["lon"][i]
        }
      except:
        pass

    d.append({
      "age": age,
      "lat": lat,
      "lng": lng,
      "A95": a95,
      "euler": euler
    }) 

  return d

with open("frames.json") as infile:
  data = json.load(infile)

full = []
for key in data:

  d = parseFrame(data[key])

  full.append({
    "name": key,
    "apwp": d
  })

print json.dumps(full)
