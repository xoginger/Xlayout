const fs = require('fs');
const FormData = require('form-data');

const dummyDxf = `  0
SECTION
  2
HEADER
  9
$ACADVER
  1
AC1027
  0
ENDSEC
  0
SECTION
  2
ENTITIES
  0
LINE
  8
0
 10
0.0
 20
0.0
 30
0.0
 11
100.0
 21
100.0
 31
0.0
  0
ENDSEC
  0
EOF`;

async function run() {
  fs.writeFileSync('/tmp/test.dxf', dummyDxf);
  const formData = new FormData();
  formData.append('file', new Blob([fs.readFileSync('/tmp/test.dxf')]), 'test.dxf');

  try {
    const res = await fetch('http://localhost/api/blueprints/convert', {
      method: 'POST',
      body: formData
    });
    
    if (!res.ok) {
      const e = await res.text();
      console.error('Error Api:', e);
      return;
    }
    
    const data = await res.json();
    console.log("Success! Extracted SVG length:", data.svg.length);
    console.log("SVG Extract:", data.svg.substring(0, 150) + '...');
  } catch(e) {
    console.error("Crash:", e);
  }
}
run();
