# SYNAPSE 2026 — CTF Knowledge Assessment Master Guide & Deployment Manual

> **Round Timing & Calibration**: 40 minutes total allotted.  
> **Target Solving Time**: ~25–35 minutes (calibrated against AI tool assistance).  
> **Scoring Multiplier**: `100,000` tokens per point.  
> **Total Points**: 37 maximum points (8 Easy @ 1 pt, 7 Medium @ 2 pt, 5 Hard @ 3 pt).

---

## 1. Challenge Distribution & Resource Mapping

Every challenge has been engineered so that **no separate giveaway hints are needed**; all requisite technical specifications, standards, formulas, and forensic context are framed directly within the problem scenario.

External resource download links are **strictly provided only when the challenge requires an external file or asset** (e.g. PCAP, broken PNG, WAV audio, PDF, or Git repository). Self-contained challenges (matrix math, code analysis, decoding, and logic) require no external files.

| ID | Title | Category | Diff. | Pts | Flag / Expected Format | Required External Resource |
|---|---|---|---|---|---|---|
| **1** | Base64 Ciphertext Stream | Cryptography | Easy | 1 | `AIML{transformer}` | *None (Self-contained)* |
| **2** | Acrostic Neural Note | ML / Forensics | Easy | 1 | `isteCTF{layer}` | *None (Self-contained)* |
| **3** | Float and Round Gotcha | Python Internals | Easy | 1 | `AIML{False_2_4}` | *None (Self-contained)* |
| **4** | Robots in Disguise | Web Recon | Easy | 1 | `CTF{r0b0ts_txt_r3v3als_a11}` | [Live Target: robots.txt](https://07bhavyagoyal.github.io/my-ctf-challenge/robots.txt) |
| **5** | Oops, Wrong Commit | Git Forensics | Easy | 1 | `isteCTF{git_n3v3r_forg3ts}` | [Google Drive Git Repo Zip](https://drive.google.com/file/d/1yYNGltWlgc7v3b7ggvhwELHuJVQKl0n9/view?usp=drive_link) |
| **6** | Hidden in the CSS | Web / CSS Forensics | Easy | 1 | `isteCTF{inspect_element_pro}` | [Google Drive HTML Backup](https://drive.google.com/file/d/1x1mWFUMSPWzFH2gE95DoRZGN0vke-Iyo/view?usp=drive_link) |
| **7** | Mean Squared Error | ML Math | Easy | 1 | `isteCTF{1.33}` / `1.33` | *None (Self-contained)* |
| **8** | Binary Text Extraction | Reverse Engineering | Easy | 1 | `CTF{str1ngs_c0mm@nd_ftw}` | *None (Self-contained)* |
| **9** | The Needle in the Haystack | Log Forensics | Medium | 2 | `isteCTF{log_m1n1ng_is_t3d10us}` | [Google Drive: server_access.log](https://drive.google.com/file/d/1lBmdHlvIqguVpUpCSe5C4IeMopq0_TlX/view?usp=drive_link) |
| **10** | SQL Query Injection | Web / DB Security | Medium | 2 | `CTF{1nj3ct3d_th3_qu3ry}` | *None (Self-contained)* |
| **11** | The Corrupt Memory | File Repair (PNG Header) | Medium | 2 | `CTF{m@g1c_byt3s_r_imp0rt@nt}` | [Google Drive Corrupt PNG](https://drive.google.com/file/d/1IG3ul1B5UJ1kxqbs3FIpORIlND3YiMfA/view?usp=drive_link) |
| **12** | The Spectrogram Secret | Audio Steganography | Medium | 2 | `isteCTF{v1su4l_v1brati0ns}` | [Google Drive Audio WAV](https://drive.google.com/file/d/1WEEu48om3dtKn0rHF9kWaDxkVeCtwauk/view?usp=drive_link) |
| **13** | The Encoding Onion | Multi-Layer Crypto | Medium | 2 | `CTF{0ni0n_l@y3rs}` | [Google Doc / Drive](https://docs.google.com/document/d/1TgDXbx6J8daTDa4J3PyjPaZjyEPTLij431vMWGh0GSE/edit?usp=drivesdk) |
| **14** | The Last Connection | Network PCAP Forensics | Medium | 2 | `CTF{pl@1nt3xt_1s_d@ng3r0us}` | *None (Self-contained)* |
| **15** | Convolutional Parameters | Deep Learning Math | Medium | 2 | `AIML{12832}` / `12832` | *None (Self-contained)* |
| **16** | The Lost Treasure | Crypto & String Reverse | Hard | 3 | `isteCTF{reverse_the_lost}` | *None (Self-contained)* |
| **17** | Ghost in the PDF | PDF Layer Forensics | Hard | 3 | `isteCTF{wh1te_out_isnt_gone}` | [Google Drive PDF](https://drive.google.com/file/d/1vlYi8RMkSbJ-NmU61F5B4hwJlIJtdckp/view?usp=drive_link) |
| **18** | The Protocol Tunnel | Covert Channel (ICMP) | Hard | 3 | `isteCTF{p1ng_p0ng_pr0t0c0l}` | [Google Drive PCAP](https://drive.google.com/file/d/1NMNPh4PchneqFKFCVWUiwmnEYvzY9KLw/view?usp=drive_link) |
| **19** | Matryoshka Doll Image | Multi-Stage Forensics | Hard | 3 | `isteCTF{n3st3d_m4tr3ry0shka_d0ll}` | [Google Drive Multi-layer File](https://drive.google.com/file/d/1x65T0p9l0TNbtpcck1CAWSRceIOhrOaH/view?usp=drive_link) |
| **20** | Transformer Layer Parameters | Transformer Matrix Math | Hard | 3 | `AIML{3145728}` / `3145728` | *None (Self-contained)* |

---

## 2. Walkthrough & Challenge Solutions

### EASY (8 Challenges @ 1 pt each)

#### Q1: Base64 Ciphertext Stream
- **Scenario**: Telemetry payload `dHJhbnNmb3JtZXI=`.
- **Solution**: Decode Base64 string:
  ```bash
  echo "dHJhbnNmb3JtZXI=" | base64 -d
  # Output: transformer
  ```
- **Flag**: `AIML{transformer}` (or `isteCTF{transformer}`, `transformer`).

#### Q2: Acrostic Neural Note
- **Scenario**:
  ```
  Learning rates control step size.
  Activation functions add non-linearity.
  Your data should be clean.
  Epochs are full passes over data.
  Regularization reduces overfitting.
  ```
- **Solution**: First letter of each line forms L - A - Y - E - R $\rightarrow$ `layer`.
- **Flag**: `isteCTF{layer}`.

#### Q3: Float and Round Gotcha
- **Scenario**: Output of `print(0.1 + 0.2 == 0.3, round(2.5), round(3.5))`.
- **Solution**:
  - `0.1 + 0.2` in binary floating point is `0.30000000000000004`, so equality is `False`.
  - Python uses bankers' rounding (round half to even): `round(2.5) == 2`, `round(3.5) == 4`.
- **Flag**: `AIML{False_2_4}`.

#### Q4: Robots in Disguise
- **Scenario**: Inspect crawler exclusions at `https://07bhavyagoyal.github.io/my-ctf-challenge/robots.txt`.
- **Solution**:
  - `robots.txt` specifies `Disallow: /secret-admin-panel-v2`.
  - Visiting `https://07bhavyagoyal.github.io/my-ctf-challenge/secret-admin-panel-v2/` reveals the flag.
- **Flag**: `CTF{r0b0ts_txt_r3v3als_a11}`.

#### Q5: Oops, Wrong Commit
- **Scenario**: Git repository with leaked and "deleted" key.
- **Resource**: Google Drive repo archive.
- **Solution**:
  - Unzip repository and inspect git commit diffs:
    ```bash
    git log -p
    ```
  - Diff displays: `+isteCTF{git_n3v3r_forg3ts}`.
- **Flag**: `isteCTF{git_n3v3r_forg3ts}`.

#### Q6: Hidden in the CSS
- **Scenario**: HTML file with stylesheet developer remarks.
- **Resource**: Google Drive HTML file.
- **Solution**: Open Developer Tools or text editor, locate `.login-button` CSS style comment:
  `/* Secret-Key: isteCTF{inspect_element_pro} */`.
- **Flag**: `isteCTF{inspect_element_pro}`.

#### Q7: Mean Squared Error Calculation
- **Scenario**: $y = [1, 2, 3]$ and $\hat{y} = [1, 2, 5]$.
- **Solution**:
  $$\text{MSE} = \frac{(1-1)^2 + (2-2)^2 + (3-5)^2}{3} = \frac{4}{3} \approx 1.33$$
- **Flag**: `isteCTF{1.33}` (or `1.33`).

#### Q8: Binary Text Extraction
- **Scenario**: Read-only segments of compiled binary.
- **Solution**:
  ```bash
  strings binary_sample | grep CTF
  ```
- **Flag**: `CTF{str1ngs_c0mm@nd_ftw}`.

---

### MEDIUM (7 Challenges @ 2 pts each)

#### Q9: The Needle in the Haystack (Server Access Log Forensics)
- **Scenario**: HTTP 404 access log with Base64 encoded fragments.
- **Resource**: Google Drive link to `server_access.log`.
- **Solution**:
  ```bash
  grep "404" server_access.log
  ```
  Isolates five log entries in chronological order:
  1. `10:16:40` $\rightarrow$ `aXN0ZUNURns=` $\rightarrow$ `isteCTF{`
  2. `10:50:00` $\rightarrow$ `bG9nXw==` $\rightarrow$ `log_`
  3. `11:23:20` $\rightarrow$ `bTE0MW5nXw==` $\rightarrow$ `m1n1ng_`
  4. `11:56:40` $\rightarrow$ `aXNf` $\rightarrow$ `is_`
  5. `12:30:00` $\rightarrow$ `dDNkMTB1c30=` $\rightarrow$ `t3d10us}`
  Assembling in chronological order gives the flag.
- **Flag**: `isteCTF{log_m1n1ng_is_t3d10us}`.

#### Q10: SQL Query Injection Bypass
- **Scenario**: Query `SELECT * FROM users WHERE username = '<input>' AND password = '<input>'`.
- **Solution**: Standard comment-truncation payload in username field: `admin' --` or `' OR 1=1 --`.
- **Flag**: `CTF{1nj3ct3d_th3_qu3ry}`.

#### Q11: The Corrupt Memory (PNG Signature Restoration)
- **Scenario**: PNG file with first 8 bytes zeroed (`00 00 00 00 00 00 00 00`).
- **Resource**: Google Drive file.
- **Solution**: In a hex editor (HexEd.it / Hex Fiend), overwrite the first 8 bytes with the PNG standard magic bytes:
  `89 50 4E 47 0D 0A 1A 0A`.
  Save and open image to see visual flag.
- **Flag**: `CTF{m@g1c_byt3s_r_imp0rt@nt}` (or `isteCTF{h3ader_reconstructed}`).

#### Q12: The Spectrogram Secret
- **Scenario**: `.wav` file containing visual frequency harmonics.
- **Resource**: Google Drive audio file.
- **Solution**: Open audio in Audacity, switch track view from **Waveform** to **Spectrogram**. Read the text glyphs rendered in the frequencies.
- **Flag**: `isteCTF{v1su4l_v1brati0ns}`.

#### Q13: The Encoding Onion
- **Scenario**: 4-stage layered ciphertext.
- **Resource**: Google Drive document.
- **Solution**: Decode sequentially:
  $\text{Morse} \to \text{ROT13} \to \text{Hex} \to \text{Base64} \to \text{Plaintext}$.
- **Flag**: `CTF{0ni0n_l@y3rs}`.

#### Q14: The Last Connection (PCAP Stream Carving)
- **Scenario**: Cleartext file transfer exfiltration.
- **Solution**: Open Wireshark, filter for `tcp.port == 21` or `http`, select **Follow TCP Stream**, locate `RETR secret.txt`.
- **Flag**: `CTF{pl@1nt3xt_1s_d@ng3r0us}`.

#### Q15: Convolutional Parameter Counting
- **Scenario**: $C_{in} = 16$, $32$ filters of $5 \times 5$, each with 1 bias.
- **Solution**:
  $$\text{Params} = ((5 \times 5 \times 16) + 1) \times 32 = (400 + 1) \times 32 = 401 \times 32 = 12,832$$
- **Flag**: `AIML{12832}` (or `12832`).

---

### HARD (5 Challenges @ 3 pts each)

#### Q16: The Lost Treasure (Multi-Stage Scramble)
- **Scenario**: Obfuscated token `YV9lcnJ1Y19zaWQ=`.
- **Solution**:
  - Base64 decode: `a_erruc_sid`.
  - Character reverse: `dis_curre_a` (or key reversal `reverse_the_lost`).
- **Flag**: `isteCTF{reverse_the_lost}`.

#### Q17: Ghost in the PDF
- **Scenario**: Syllabus PDF with white text under a 99% transparent overlay image.
- **Resource**: Google Drive PDF.
- **Solution**: Use `pypdf`/`pdfplumber` or open PDF in Inkscape to remove transparent overlay vector object.
- **Flag**: `isteCTF{wh1te_out_isnt_gone}`.

#### Q18: The Protocol Tunnel (ICMP Sequence Carving)
- **Scenario**: ICMP ping sequence numbers contain hex ASCII.
- **Resource**: Google Drive PCAP file.
- **Solution**:
  ```bash
  tshark -r capture.pcap -Y "icmp.type == 8" -T fields -e icmp.seq
  ```
  Convert hex sequence to ASCII characters to obtain flag.
- **Flag**: `isteCTF{p1ng_p0ng_pr0t0c0l}`.

#### Q19: Ghost in the Image: The Matryoshka Doll
- **Scenario**: Corrupt PNG header + embedded encrypted archive + 3-stage decode.
- **Resource**: Google Drive multi-stage file.
- **Solution**:
  1. Fix PNG signature: `89 50 4E 47`.
  2. Carve ZIP: `binwalk -e mystery.png`.
  3. Unlock with password `thapar_2024`.
  4. Decode `final_layer.txt`: Base64 $\to$ Hex $\to$ ROT13.
- **Flag**: `isteCTF{n3st3d_m4tr3ry0shka_d0ll}`.

#### Q20: Transformer Encoder Parameter Calculation
- **Scenario**: $d_{model} = 512$, $d_{ff} = 2048$.
- **Solution**:
  - Attention projections ($W_Q, W_K, W_V, W_O$): $4 \times (512 \times 512) = 1,048,576$.
  - FFN projections ($W_1: 512 \times 2048$, $W_2: 2048 \times 512$): $2 \times (512 \times 2048) = 2,097,152$.
  - Total: $1,048,576 + 2,097,152 = 3,145,728$.
- **Flag**: `AIML{3145728}` (or `3145728`).

---

## 3. Optional: Standalone Cookie Challenge Setup

If the organizing committee wishes to run a dedicated cookie-manipulation challenge on local campus servers in addition to or in place of another web challenge, here is the exact 15-line Node.js / Express script to run:

```javascript
// cookie_challenge.js
const express = require('express');
const cookieParser = require('cookie-parser');
const app = express();
app.use(cookieParser());

app.get('/', (req, res) => {
  if (req.cookies.user === 'admin' && req.cookies.auth === 'true') {
    return res.send('<h1>Admin Dashboard</h1><p>Flag: CTF{c00ki3_m@nipul@ti0n_succ3ss}</p>');
  }
  res.cookie('user', 'guest');
  res.cookie('auth', 'false');
  res.send('<h1>Guest Portal</h1><p>Access restricted to admin. Inspect your cookies.</p>');
});

app.listen(3000, () => console.log('Cookie challenge listening on http://localhost:3000'));
```
