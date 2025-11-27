document.addEventListener("DOMContentLoaded", function (event) {
    document.getElementById("calculate-suncompass").addEventListener("click", calculateSunCompass)
    // document.getElementById("residualsWhich").addEventListener("change", switchStuff)

    document.getElementById("importFile-suncompass").addEventListener("change", importing)

    document.getElementById("load-data-suncompass").addEventListener("click", function (event) {
        document.getElementById("importFile-suncompass").click()
    })
})

var documentsSunCompass = []

function importing(event) {

    var input = event.target
    var reader = new FileReader()
    reader.readAsText(input.files[0])

    reader.onload = function () {

        var text = reader.result
        var lines = text.split('\n')
        lines = lines.filter(Boolean)
        for (var i = 0; i < lines.length; i++) {
            var parameters = lines[i].split(/[,\s\t]+/)
            parameters = parameters.filter(x => x !== "")
            documentsSunCompass.push({
                name: parameters[0],
                date: parameters[1],
                delta_u: parseFloat(parameters[2]),
                lat: parseFloat(parameters[3]),
                lon: parseFloat(parameters[4]),
                shadow_angle: parseFloat(parameters[5])
            })

            if (parameters.length < 6) {
                return notify('danger', 'Input file was not designed for the sun compass test')
            }
        }

        notify('success', lines.length + ' samples have been added.');
    }


}

function calculateSunCompass() {
    var table = [
        "  <thead>",
        "  <tr>",
        "    <td>Name</td>",
        "    <td>Date</td>",
        "    <td>Δu</td>",
        "    <td>Latitude</td>",
        "    <td>Longitude</td>",
        "    <td>Shadow Angle</td>",
        "    <td>Core Azimuth</td>",
        "  </tr>",
        "  </thead>",
        "  <tbody>"
    ]

    for (let document of documentsSunCompass) {
        var date = document['date'].split(':')
        table.push("  <tr>")
        table.push("    <td>" + document['name'] + "</td>")
        table.push("    <td>" + date[2].padStart(2, '0') + "/" + date[1].padStart(2, '0') + "/" + date[0] + " " + date[3].padStart(2, '0') + ":" + date[4].padStart(2, '0') + "</td>")
        table.push("    <td>" + document['delta_u'] + "</td>")
        table.push("    <td>" + document['lat'] + "</td>")
        table.push("    <td>" + document['lon'] + "</td>")
        table.push("    <td>" + document['shadow_angle'] + "</td>")
        table.push("    <td>" + dosundec(document).toFixed(2) + "</td>")
        table.push("  </tr>")
    }
    table.push("  </tbody>")
    document.getElementById("suncompass-table").innerHTML = table.join("\n");
}

function dosundec(sundata) {
    let timedate = sundata["date"].split(":")
    let year = parseInt(timedate[0])
    let mon = parseInt(timedate[1])
    let day = parseInt(timedate[2])
    let hours = parseFloat(timedate[3])
    let min = parseFloat(timedate[4])
    let du = parseInt(sundata["delta_u"])
    let hrs = hours - du

    if (hrs > 24) {
        day += 1
        hrs = hrs - 24
    }
    if (hrs < 0) {
        day -= 1
        hrs = hrs + 24
    }

    let julian_day = julian(mon, day, year)
    let utd = (hrs + (min / 60)) / 24
    let gha_delta = gha(julian_day, utd)
    let greenwich_hour_angle = gha_delta[0]
    let delta = gha_delta[1]
    let H = greenwich_hour_angle + parseFloat(sundata["lon"])

    if (H > 360) {
        H = H - 360
    }

    let lat = parseFloat(sundata["lat"])
    if (H > 90 && H < 270) {
        lat = -lat
    }

    lat = math.unit(lat, 'deg').toNumber('rad')
    delta = math.unit(delta, 'deg').toNumber('rad')
    H = math.unit(H, 'deg').toNumber('rad')

    let ctheta = math.sin(lat) * math.sin(delta) + math.cos(lat) * math.cos(delta) * math.cos(H)
    let theta = math.acos(ctheta)
    let beta = math.cos(delta) * math.sin(H) / math.sin(theta)
    beta = math.unit(math.asin(beta), 'rad').toNumber('deg')

    if (delta < lat) {
        beta = 180 - beta
    }

    let sunaz = 180 - beta
    sunaz = (sunaz + parseFloat(sundata["shadow_angle"])) % 360

    if (sunaz < 0) {
        sunaz = sunaz + 360
    }

    return sunaz
}

function julian(month, day, year) {
    // Julian date calculation
    if (month <= 2) {
        year -= 1
        month += 12
    }
    const A = Math.floor(year / 100)
    const B = 2 - A + Math.floor(A / 4)
    const JD = Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5
    return JD
}

function gha(julian_day, f) {
    const rad = math.pi / 180
    const d = julian_day - 2451545.0 + f
    let L = 280.459 + 0.98564736 * d
    let g = 357.529 + 0.98560028 * d
    L = L % 360
    g = g % 360

    // ecliptic longitude
    const lamb = L + 1.915 * math.sin(g * rad) + 0.02 * math.sin(2 * g * rad)

    // obliquity of ecliptic
    const epsilon = 23.439 - 0.00000036 * d

    // right ascension (in same quadrant as lambda)
    const t = math.square(math.tan((epsilon * rad) / 2))
    const r = 1 / rad
    const rl = lamb * rad
    let alpha = lamb - r * t * math.sin(2 * rl) + (r / 2) * math.square(t) * math.sin(4 * rl)

    // declination
    let delta = math.sin(epsilon * rad) * math.sin(lamb * rad)
    delta = math.asin(delta) / rad

    // equation of time
    const eqt = (L - alpha)

    const utm = f * 24 * 60
    let H = (utm / 4) + eqt + 180
    H = H % 360.0

    return [H, delta]
}