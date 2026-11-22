Arnav{
1. Which Earth does Dr. Doom Belong To (Earth:-_._._)?? 
Ans:- 
(828)
2. What is the name of the fictional Eastern European nation ruled by Victor von Doom? 
Ans:-
(Latveria/ Kingdom of Latveria)
}

3Madhav Sharma
Q1. What one word describes the problem in RNNs where gradients shrink exponentially across many time steps, making long-range dependencies hard to learn?
A: Vanishing (vanishing gradients). Repeated multiplication by Jacobians with norm below 1 drives the gradient toward zero. 
An algorithm is given a large collection of images, but instead of identifying entire objects, it must classify every individual pixel according to the object it belongs to. What computer vision task is being performed?
Answer: Image Segmentation

Q2. What term describes the failure where a reward-model-optimized policy exploits flaws in the proxy reward rather than improving true quality?
A: Overoptimization (reward hacking / Goodhart’s law). Gao et al. (2022) showed true reward peaks and then declines as you optimize the proxy harder. 

Q3. True values [1, 2, 3], predictions [1, 2, 5]. What is the Mean Squared Error, to 2 decimals?
Ans: isteCTF{1.33} 

Q4. Read this ML note carefully. Is there a pattern?
Learning rates control step size.
 Activation functions add non-linearity.
 Your data should be clean.
 Epochs are full passes over data.
 Regularization reduces overfitting.
Ans: isteCTF{layer}
 Hint: Look at the first letter of each line.
 Soln: Acrostic: L-A-Y-E-R.

Q5. A slide about “Overfitting” looks empty at the bottom. slide.pdf
Ans: isteCTF{white_text}
Hint: Select all (Ctrl + A).
Soln: The flag is written in white text on a white background. Select all to highlight it, or copy-paste it somewhere.

Q6. In a GAN, two networks compete. One makes fake data. What is the other one called? (one word, lowercase)
Ans: isteCTF{discriminator} 
Q8 . The Last Connection 💻 — Network CTF (Medium)
Challenge description:
One device disappeared from the network without warning. Before it went offline, it sent a few packets.
A packet capture was recovered. Somewhere inside it lies the last message the device sent.
Find the lost connection.
Flag format: isteCTF{}
Hidden flag: isteCTF{last_packet_home}
Hint: Follow the stream.
Solution: Open the PCAP in Wireshark → Follow TCP Stream → inspect the conversation.
Q9. The Lost Treasure 🏴‍☠️ — Multi-layer CTF (Hard)
Challenge description:
A treasure map was recovered, but the directions were deliberately scrambled.
The message was encrypted, encoded, and hidden in plain sight.
Three layers protect the treasure. Break them, and the treasure is yours.
Encoded message:
YV9lcnJ1Y19zaWQ=
Flag format: isteCTF{}
Hint 1: The treasure has been turned around.
Hint 2: Decode before you decrypt.
Solution:
Decode Base64.
Reverse the output.
Inspect the result.
Flag: isteCTF{reverse_the_lost}



Prachi Tibrewal
Q .1 A neural network is learning so slowly that its creators suspect the numerical adjustments being made to its parameters are simply too small to produce meaningful progress. Which training parameter should they investigate?
Answer: Learning Rate

Q. 2 An AI system is trained to recognise handwritten digits. However, a few carefully modified pixels cause it to mistake a perfectly ordinary number for something entirely different. What type of attack has it encountered?
Answer: Adversarial Attack

Ques 3. An AI model is trained on information collected from one population. When introduced to an entirely different population, its predictions begin to collapse because the underlying patterns are no longer the same. What phenomenon is occurring?
Answer: Distribution Shift

Ques 4. An autonomous vehicle is repeatedly rewarded for reaching its destination. However, it discovers a rather questionable shortcut: instead of learning to navigate safely, it exploits a loophole in the reward mechanism and begins performing actions that technically maximise its score but defeat the original purpose. What is this problem known as?
Answer: Reward Hacking.         
    Ques 5.  A researcher wants to prevent a neural network from becoming unnecessarily complicated. They introduce a mathematical penalty that discourages excessively large parameter values and encourages simpler models. What technique are they using?
Answer: Regularization


Ques 6 . An algorithm is presented with a dataset containing thousands of variables, many of which contribute almost nothing to the final prediction. To prevent computational chaos, it attempts to eliminate irrelevant information while preserving the most useful signals. What technique is being applied?

Answer: Feature Selection

Ques 7  A neural network receives an image and begins analysing it through multiple layers, first identifying simple edges and textures before recognising complex objects. What architecture is particularly designed for such visual tasks?

Answer: CNN 
Ques 8 . A machine learning algorithm is given thousands of customer records. It begins identifying groups of customers with similar behaviour, without anyone telling it how many categories should exist beforehand. What process is taking place?
Answer: Clustering
Ques 9 . A machine learning system is given a collection of variables, but some contain extremely similar information. The model struggles with unstable predictions because these variables are highly correlated. What statistical problem is this?
Answer: Multicollinearity
Ques 10 . A model is trained to predict the probability of several possible outcomes. Its raw numerical scores are transformed into probabilities that collectively add up to exactly one. Which mathematical function performs this transformation?
Answer: Softmax

                                                                                                                                                        Ques 11 . Two competing neural networks enter an artificial arms race. One attempts to manufacture increasingly convincing synthetic data, while the other relentlessly tries to expose every fabrication. Their competition continues until the generated outputs become almost indistinguishable from reality. What architecture are we describing?
Answer: GAN
DEVANSH AGGARWAL
A1. Softmax Splash. Logits are [ln 1, ln 2, ln 5]. What is the softmax probability of the third class, as a simplified fraction? AIML{5/8}
A2. Kernel Count. A conv layer has 16 input channels, 32 filters of size 5×5, with biases. How many trainable parameters? Flag: AIML{<n>} AIML{12832}
A3. Shrinking Map. Input 64×64, 8 filters, kernel 5×5, stride 2, padding 2. Flag: AIML{H_W_C} AIML{32_32_8}
A4. Two Samples. Binary cross-entropy in bits, averaged over 2 samples: (y=1, p=1/8) and (y=0, p=1/2), where p is the predicted P(y=1). AIML{2}
A5. Adam's First Step. w=1, gradient g=4, lr=0.1, β1=0.9, β2=0.999, with bias correction, ε→0. What is w after exactly one Adam step? AIML{0.9}
A6. Momentum Roll. Minimise f(w)=w² from w=3, lr=0.1, momentum β=0.5 using v ← βv + g, w ← w − lr·v. Find w after 2 steps. AIML{1.62}
A7. Stacked View. Three stacked 3×3 conv layers, stride 1, no dilation. What is the receptive field side length of one output unit? AIML{7}
A8. Divergence. P=[1/2, 1/2, 0], Q=[1/4, 1/2, 1/4]. Find KL(P‖Q) in bits. AIML{0.5}
A9. Specificity. TP=30, FP=10, FN=30, TN=130. Specificity as a simplified fraction? AIML{13/14}
A10. Layer Weight. One transformer encoder layer with d_model=512 and FFN hidden size 2048. Count only the Q/K/V/O projections and the two FFN matrices. Ignore biases and LayerNorm. AIML{3145728}

B1. Axis Trap.
python
import numpy as np
a = np.arange(24).reshape(2,3,4)
print(a.sum(axis=1)[1,2])
AIML{54}
B2. Mirror Dot.
python
import numpy as np
a = np.array([1,2,3,4])
print((a[::-1]*a).sum())
AIML{20}
B3. Shared Rows.
python
x = [[0]]*3
x[0].append(1)
print(len(x[2]))
AIML{2}
B4. Broadcast Shape. Shapes (5,1,3) and (4,1) are added. Flag: AIML{a_b_c} AIML{5_4_3}
B5. View Surprise.
python
import numpy as np
a = np.ones((2,2))
b = a[0]
b *= 5
print(a.sum())
Flag: AIML{<number>}. Write it as an integer, without a decimal point. AIML{12}
B6. Argmax Columns.
python
import numpy as np
print(np.array([[3,9,2],[9,8,7]]).argmax(axis=0).tolist())
Flag: the digits joined with no separators, AIML{ddd} AIML{101}
B7. Stride Slice.
python
import numpy as np
print(np.arange(10)[2:8:3].sum())
AIML{7}
B8. Sticky Default.
python
def f(x, l=[]):
    l.append(x)
    return l
f(1); f(2)
print(f(3))
Flag: the list items joined with _. AIML{1_2_3}
B9. Float Gotcha.
python
print(0.1+0.2==0.3, round(2.5), round(3.5))
Flag: the three printed values joined with _. AIML{False_2_4}
B10. Filter Sum.
python
print(sum(i for i in range(10) if i % 3 == 0))
AIML{18}
C. Encoding and Decoding (C1-C10)
C1. Shifted Weights. Caesar cipher, shift +3 was applied. Decode ZHLJKWV and wrap it in the flag format. AIML{WEIGHTS}
C2. Hex Memory. 4c 53 54 4d AIML{LSTM}
C3. Base64 Block. dHJhbnNmb3JtZXI= AIML{transformer}
C4. Base32. KNHUMVCNIFMA==== AIML{SOFTMAX}
C5. Flipped Dropout. The text was ROT13-encoded and then reversed. Decode GHBCBEQ. AIML{DROPOUT}
C6. Binary Optimizer. 01000001 01000100 01000001 01001101 AIML{ADAM}
C7. Decimal Batch. Decode the ASCII codes 66 65 84 67 72. AIML{BATCH}
C8. XOR Epoch. Each byte of the plaintext was XORed with 0x2A. The result in hex is 6f7a656962. Recover the plaintext. AIML{EPOCH}
C9. Double Wrap. The hex 6332396d6447316865413d3d decodes to text that is itself Base64. Find the final word. AIML{softmax}
C10. Dots and Dashes. .-.. --- ... ... AIML{LOSS}

SHREYAS BHATTACHARYA
Q1) “Oops, Wrong Commit” (Git / Software Engineering)
Description:
“Our developer accidentally pushed the database password to GitHub. He panicked, deleted it in the next commit, and says it’s gone forever. Is it?”
Link/File: project.zip, a folder that contains a .git directory
Setup: Create a small repo. Commit a config.py that contains DB_PASS = "CTF{g1t_n3v3r_f0rg3ts}". In the next commit, replace the line with DB_PASS = os.getenv("DB_PASS"). Add 4–5 more ordinary commits on top, then zip the whole folder, including .git.
Hint: Git remembers everything. Check the history, not just the latest version.
Answer/Flag: CTF{g1t_n3v3r_f0rg3ts} (found with git log -p)
Q2) “Login Without a Password” (Web / DBMS)
Description:
“The admin portal asks for a username and password. We don’t know the password, but the developer built the SQL query by gluing strings together. Get in as admin.”
Link/Setup: A simple PHP or Flask login page with SQLite behind it. Use a deliberately vulnerable query:
SELECT * FROM users WHERE username='<input>' AND password='<input>'
Show the flag when any row comes back for admin. A payload such as admin' -- in the username field should work.
Hint: What happens if your username contains a quote? SQL comments might help you skip the rest of the check.
Answer/Flag: CTF{1nj3ct3d_th3_qu3ry}
Q3) “Eavesdropper” (Computer Networks)
Description:
“We captured network traffic from a café Wi-Fi. A user logged in to an old FTP server. Find out what he downloaded.”
Link/File: capture.pcap
Setup: Run a local FTP server and record the traffic with Wireshark. Log in with user / pass123 and download a file called secret.txt that contains the flag. Generate some background HTTP and DNS traffic so the FTP session isn’t obvious.
Hint: FTP sends everything in plain text. Open the capture in Wireshark and try “Follow TCP Stream”.
Answer/Flag: CTF{pl@1nt3xt_1s_d@ng3r0us}
Q4) “Locked Archive” (Cryptography / Password Security)
Description:
“We found a password-protected ZIP on the suspect’s pen drive. He’s lazy and always uses passwords from the most common password lists.”
Link/File: vault.zip
Setup: Create flag.txt and zip it with password sunshine1, which is in the well-known rockyou wordlist: zip -P sunshine1 vault.zip flag.txt
Hint: Brute force is slow, and a dictionary is smart. Tools: fcrackzip, john (with zip2john), and the rockyou.txt wordlist.
Answer/Flag: CTF{w0rdl1sts_@r3_p0w3rful}
Q5) “Eavesdropper” (Computer Networks)
Description:
“We captured network traffic from a café Wi-Fi. A user logged in to an old FTP server. Find out what he downloaded.”
Link/File: capture.pcap
Setup: Run a local FTP server and record the traffic with Wireshark. Log in with user / pass123 and download a file called secret.txt that contains the flag. Generate some background HTTP and DNS traffic so the FTP session isn’t obvious.
Hint: FTP sends everything in plain text. Open the capture in Wireshark and try “Follow TCP Stream”.
Answer/Flag: CTF{pl@1nt3xt_1s_d@ng3r0us}





Q1)
Description:
"Our admin swears his website is secure because he hid the login page. He says only robots can find it, but we think he just configured his search engine crawler settings wrong. Find the hidden page and get the flag."
Link/Setup: Host a simple website.
Create a robots.txt file at website.com/robots.txt.
Inside robots.txt, put: User-agent: * Disallow: /secret-admin-panel-v2.
Create the folder /secret-admin-panel-v2 with a file index.html that contains the flag.
Hint: Search engines respect this file, but hackers read it. Check the root directory.
Answer/Flag: CTF{r0b0ts_txt_r3v3als_a11}

Q2)
Description:
"We recovered this PNG image from a smashed hard drive. It won't open. The header seems broken. Can you fix it and tell us what the image says?"
Link/File: Provide a .png file where you have used a Hex Editor to change the first 8 bytes (Magic Bytes) to random zeros (00 00 00 00 00 00 00 00).
Hint: Every PNG file starts with the same 8 magic bytes. Google "PNG file signature."
Answer/Flag: CTF{m@g1c_byt3s_r_imp0rt@nt} (The flag is written visually on the image itself).

Q3)
Description:
"The suspect sent this audio file to his accomplice. It sounds like just white noise and beeping, but we know there's text hidden inside. It's not Morse code."
Link/File: Provide a .wav file.
Setup: Use a tool like DeepSound or Coagula (spectrogram) to hide text inside the audio. If using a spectrogram, the user must open the audio in "Audacity" and switch to "Spectrogram View" to see the letters of the flag drawn in the sound waves.
Hint: Look at the audio, don't just listen to it. Use a Spectrogram analyzer.
Answer/Flag: CTF{s33_th3_s0und_w@v3s}

Q4)
Description:
"This website only serves premium content to the 'admin'. I tried telling it I'm the admin, but it doesn't believe me. Maybe you can convince the cookies?"
Link/Setup: A simple login page.
When a user logs in as "guest", set a cookie: user=guest and auth=false.
The user must edit the cookie using "Inspect Element" -> "Application" tab to: user=admin and auth=true.
Upon refreshing with the edited cookie, display the flag.
Hint: The site remembers you using sweet treats stored in your browser. Burp Suite or Developer Tools might help.
Answer/Flag: CTF{c00ki3_m@nipul@ti0n_succ3ss}

Q5)
Description:
"We found this executable program. We don't know what it does, and we are too scared to run it. Can you find the secret passcode hardcoded inside it without running it?"
Link/File: Provide a simple compiled "Hello World" style executable (e.g., program.exe) that checks a password.
Setup: In the C/Python code, define a variable secret_flag = "CTF{str1ngs_c0mm@nd_ftw}". Compile it.
Hint: Linux has a command specifically for pulling readable text out of binary files.
Answer/Flag: CTF{str1ngs_c0mm@nd_ftw} (Found by running strings program.exe | grep CTF).


Q6)
Description:
"We are tracking a hacker who goes by the handle 'GhostRider_99'. He posted a photo of his view yesterday but deleted it. We managed to save the image hash. Wait... he actually commented on a popular tech forum 3 years ago with the same username. Find his favorite coffee shop location mentioned in his bio on that old account."
(Note: This requires you to set up a fake profile or find a real safe target).
Alternative Setup: "Find the BSSID of the WiFi router at the specific coordinates: 37.422, -122.084. The flag is the BSSID name."
Hint: Use tools like Wigle.net or Google Maps reviews.
Answer/Flag: CTF{G00gl3_Plex_Wif1}


Q7)
Description:
"We found a text file that looks like gibberish. It seems to be encoded... multiple times. Peel back the layers."
Link/File: flag.txt
Setup: Take the flag CTF{0ni0n_l@y3rs}.
Encode in Base64.
Take that result, encode in Hex.
Take that result, encode in Rot13.
Take that result, encode in Morse Code.
Save the Morse code to the text file.
Hint: Identify the format, decode, repeat. Tools like CyberChef are your friend.
Answer/Flag: CTF{0ni0n_l@y3rs}


Reverse 4. Engineering: "The Polyglot Proteus"
Focus: Multi-Architecture & Virtualization Obfuscation
Scenario: You are given a small .bin file.
The Setup: When run on x86_64, it prints "Incorrect Key." However, if you look at the entry point in a disassembler like Ghidra, the code looks like complete nonsense.
The Twist: The binary is a custom Virtual Machine (VM). The first few hundred bytes are an x86 loader that sets up a tiny interpreter. The "nonsense" code is actually a custom bytecode instruction set. To make it harder, the VM instructions change their meaning (opcodes rotate) every 10 cycles.
Objective: Decompile the VM loader, map the custom opcodes, and reverse the logic of the bytecode to find the "Key" that satisfies the check.
3. Cryptography: "The Faulty Oracle"
Focus: Padding Oracle & Bit-flipping on AES-GCM
Scenario: An API uses AES-GCM to encrypt session tokens. The tokens look like BASE64(IV + Ciphertext + Tag).
The Setup: The developer mistakenly implemented a custom "integrity check" before the GCM tag is verified. If the decrypted JSON is malformed, the server returns a specific "Invalid JSON" error. If the GCM tag itself is wrong, it returns "Integrity Error."
The Twist: The difference in error messages creates a side-channel. Additionally, the intern used a static Nonce/IV for all sessions (the "Forbidden Attack").
Objective: Use the static nonce to recover the authentication key (GHASH key). Once the key is recovered, forge a new token with {"admin": true} and calculate a valid GCM tag to bypass security.
2. Binary Exploitation: "The Restricted Sandbox"
Focus: Seccomp Bypass & ROP (Return Oriented Programming)
Scenario: A Linux binary allows you to provide a "plugin" in the form of shellcode.
The Setup: The binary has all protections enabled: ASLR, NX, PIE, and Stack Canaries. Crucially, it uses a Seccomp filter that restricts syscalls, allowing only read, write, and exit. execve and open are strictly forbidden.
The Twist: There is a file named flag.txt already opened by the parent process at a known file descriptor (e.g., FD 5). However, the sandbox blocks you from listing open files.
Objective: You must leak the canary and the base address using a format string bug, then build a ROP chain that uses the existing read syscall on FD 5 to pipe the flag into the write syscall (stdout).
1. Web Exploitation: "The Ghost in the Middleware"
Focus: Request Smuggling & Cache Poisoning
Scenario: A modern web application uses a high-performance frontend cache (like Varnish or Nginx) and a Python-based backend.
The Setup: The backend is vulnerable to HTTP Request Smuggling due to inconsistent handling of Transfer-Encoding and Content-Length headers.
The Twist: Simply smuggling a request doesn't give you the flag. The flag is stored in an administrator’s private dashboard. You must smuggle a request that poisons the cache for a common static file (e.g., scripts.js) to include a malicious payload. When the admin logs in, the poisoned script executes in their browser, sending their session cookie to your server.
Objective: Perform a "Web Cache Deception" attack to hijack the admin session and read the flag from /admin/dashboard.



 CTF Questions:
HARDIK
1. 
Beneath the roaring tide of sound,
A secret waits in silence bound.
I speak not with tongue, nor mortal breath—
But paint my truth in bands of death.
Q: What sacred word does the waterfall whisper when the eye of Ra beholds its many-colored veil?
Hint: Command the waves to kneel before the prism-throne.
Let time become a ladder of fire and shadow.
There, in the tomb of frequencies, the hieroglyphs of sound shall rise—
Read them not with ears… but with the gaze of kings.

Answer: CTF{_i_see_the_sound_}
audiocheck.net_spectrotyper.wav

2. 
The letters aren’t wrong. Their costumes are.

Hint: figure out what font this is. Filename is encrypted in standard caesar, points to the file link
SOLUTION: —--
Answer: isteCTF{f0nts_c4n_l13_t00}

3. Website hunt
4. https://bugbite-zeta.vercel.app/
5. https://100-c.vercel.app/
6. AI vs Player A chatbot refuses to give the flag—but leaks it if you phrase the question just right.
2. BHAVYA



Q1) Description:
"We recovered this PNG image from a smashed hard drive. It won't open. The header seems broken. Can you fix it and tell us what the image says?"
Link/File: Provide a .png file where you have used a Hex Editor to change the first 8 bytes (Magic Bytes) to random zeros (00 00 00 00 00 00 00 00).
Hint: Every PNG file starts with the same 8 magic bytes. Google "PNG file signature."
Answer/Flag: CTF{m@g1c_byt3s_r_imp0rt@nt} (The flag is written visually on the image itself).
https://docs.google.com/document/d/1FP-_fzKbk4Yi6X0L-HZEP726YizNFxYPaIiR5qnbdkU/edit?usp=drivesdk

Q2) Description:
"Our admin swears his website is secure because he hid the login page. He says only robots can find it, but we think he just configured his search engine crawler settings wrong. Find the hidden page and get the flag."
Link/Setup: Host a simple website.
Create a robots.txt file at website.com/robots.txt.
Inside robots.txt, put: User-agent: * Disallow: /secret-admin-panel-v2.
Create the folder /secret-admin-panel-v2 with a file index.html that contains the flag.
Hint: Search engines respect this file, but hackers read it. Check the root directory.
Answer/Flag: CTF{r0b0ts_txt_r3v3als_a11}
07bhavyagoyal.github.io/my-ctf-challenge/robots.txt

Q3) Description:
"We found a text file that looks like gibberish. It seems to be encoded... multiple times. Peel back the layers."
Link/File: flag.txt
Setup: Take the flag CTF{0ni0n_l@y3rs}.
Encode in Base64.
Take that result, encode in Hex.
Take that result, encode in Rot13.
Take that result, encode in Morse Code.
Save the Morse code to the text file.
Hint: Identify the format, decode, repeat. Tools like CyberChef are your friend.
Answer/Flag: CTF{0ni0n_l@y3rs}
https://docs.google.com/document/d/1TgDXbx6J8daTDa4J3PyjPaZjyEPTLij431vMWGh0GSE/edit?usp=drivesdk

Q4) Description:
"The suspect sent this audio file to his accomplice. It sounds like just white noise and beeping, but we know there's text hidden inside. It's not Morse code."
Link/File: Provide a .wav file.
Setup: Use a tool like DeepSound or Coagula (spectrogram) to hide text inside the audio. If using a spectrogram, the user must open the audio in "Audacity" and switch to "Spectrogram View" to see the letters of the flag drawn in the sound waves.
Hint: Look at the audio, don't just listen to it. Use a Spectrogram analyzer.
Answer/Flag: CTF{s33_th3_s0und_w@v3s}
https://drive.google.com/file/d/1gUDS28HJTXURwun2r_yuMx2eROcye6AY/view?usp=drivesdk

Q5) Description:
"This website only serves premium content to the 'admin'. I tried telling it I'm the admin, but it doesn't believe me. Maybe you can convince the cookies?"
Link/Setup: A simple login page.
When a user logs in as "guest", set a cookie: user=guest and auth=false.
The user must edit the cookie using "Inspect Element" -> "Application" tab to: user=admin and auth=true.
Upon refreshing with the edited cookie, display the flag.
Hint: The site remembers you using sweet treats stored in your browser. Burp Suite or Developer Tools might help.
Answer/Flag: CTF{c00ki3_m@nipul@ti0n_succ3ss}

Cookie-hacker--bhavyagoyal.replit.app




HIYA
	QUESTION 3;---
The Spectrogram Secret (Audio)
Concept: Hiding a visual message inside an audio frequency graph.
Ques: "This audio file sounds like static noise, but perhaps you’re looking at it the wrong way. Don't just listen, look at the sound."
https://drive.google.com/file/d/1WEEu48om3dtKn0rHF9kWaDxkVeCtwauk/view?usp=drive_link
Method: Use a tool like AudioPaint or Coagula to turn an image of text into a WAV file. When viewed in a Spectrogram (using Audacity), the text appears.
Hint: "Sound has a shape. Open the file in an editor and switch from 'Waveform' to 'Spectrogram' view to see the invisible."
Soln: Open the audio in Audacity → Click the track dropdown → Select Spectrogram.
Ans: isteCTF{v1su4l_v1brati0ns}



QUESTION 
The "Corrupt" Memory (File Repair)
Concept: Intentionally "breaking" a file header so it won't open.
The Ques: "We intercepted a transmission, but the file header was wiped during transit. It says it's a .png, but no viewer can open it. Can you perform surgery on the bytes?"
The File: Take a PNG image with the flag. Open it in a Hex Editor (like HexEd.it) and change the first 8 bytes to 00 00 00 00 00 00 00 00.
Hint: "Every PNG starts with a specific signature: 89 50 4E 47. This file seems to have lost its identity. Fix the header, fix the image."
Soln: Players use a Hex Editor to change the first 8 bytes back to the standard PNG header.
Ans: isteCTF{h3ader_reconstructed}
https://drive.google.com/file/d/1IG3ul1B5UJ1kxqbs3FIpORIlND3YiMfA/view?usp=drive_link
QUESTION6-
 The "Ghost in the PDF" (Forensics/Logic)
Concept: Using white text on a white background and hidden layers.
The Ques: "The professor sent out the syllabus, but students noticed the file size was unusually large for a single page of text. Is there a ghost in the machine?"
The Method: 1. Create a Word document. Type the flag: isteCTF{wh1te_out_isnt_gone}.
2. Change the font color of the flag to pure white.
3. Place a large image over the text and set the image transparency to 99% (so it’s invisible but "covers" the page).
4. Save as a PDF.
The Twist: If a player tries to "Select All" ($Command + A$), the hidden text might not show up because of the invisible image layer.
Soln: Players must use an online PDF-to-Text converter or open the PDF in a vector tool (like Illustrator or a free online SVG editor) to move the layers and see the white text.
Ans: isteCTF{wh1te_out_isnt_gone}
https://drive.google.com/file/d/1vlYi8RMkSbJ-NmU61F5B4hwJlIJtdckp/view?usp=drive_link

QUESTION 7
The "GPS Mystery" (OSINT/Mapping)
Concept: Hiding a flag in the coordinates of a famous location.
The Ques: "An anonymous tip gave us a sequence of 5 images of famous landmarks around Thapar University (or the world). If you find the exact coordinates of where the photographer stood, the first decimal of each 'North' coordinate will reveal the code."
The Method: 1. Give them 5 photos.
2. Example: Photo 1 is the Eiffel Tower. The Latitude is $48.8584° N$. The first decimal is 8.
3. Photo 2 is the Colosseum. The Latitude is $41.8902° N$. The first decimal is 8.
4. The string of decimals becomes the flag.
Hint: "Don't look at the buildings; look at where you are standing. The North star points the way to the digits."
Ans: isteCTF{88234} (based on your chosen locations).
https://drive.google.com/drive/folders/1A96UzmG2Jd8a2MUZ7gpbK2iwPa4YEIHA?usp=drive_link


QUESTION 
The "Hidden in the CSS" (Web/Code)
Concept: Hiding the flag in the styling of a fake website.
The Ques: "We found a backup of a login page. The 'Login' button doesn't work, but the way it's styled seems... suspicious."
The Method: Provide a simple HTML file. Inside the <style> tag, create a comment or use the color codes themselves to hide the flag.
CSS
.login-button {
    background-color: #464c41; /* Hex for FL */
    color: #477b73;            /* Hex for GS */
    /* Secret-Key: isteCTF{inspect_element_pro} */
}


Soln: Players must right-click → Inspect Element and look at the CSS styles to find the comment.
Ans: isteCTF{inspect_element_pro}
https://drive.google.com/file/d/1x1mWFUMSPWzFH2gE95DoRZGN0vke-Iyo/view?usp=drive_link
QUESTION-
The "Invisible" Git History (Development/Forensics)
Concept: Hiding a flag in a previous version of a file using Git.
The Ques: "A developer realized they accidentally committed the API key to the repository. They deleted the key and uploaded a new version, thinking it was gone forever. Can you recover the 'deleted' secret?"
The Method: 1. Create a folder and initialize it as a git repo (git init). 2. Create flag.txt with the real flag, then git add and git commit it. 3. Change flag.txt to say "Nothing here!" and commit it again. 4. Give the participants the .zip of the whole folder (including the hidden .git folder).
Soln: Players must use git log -p or git checkout to look at the previous commit.
Hint: "Deleting something doesn't mean it's forgotten. History always leaves a trail."
Ans: isteCTF{git_n3v3r_forg3ts}
The player will unzip the file and see a file that says "Nothing to see here." To win, they have to use Git commands to look at the history:
Check the logs: They run git log. They will see two commits: "Initial commit" and "Removed sensitive info."
View the change: They run git show HEAD^ or git checkout HEAD^1.
The Result: The terminal will show the "deleted" line: +isteCTF{git_n3v3r_forg3ts}.
https://drive.google.com/file/d/1yYNGltWlgc7v3b7ggvhwELHuJVQKl0n9/view?usp=drive_link

QUESTION-
The "Whitespace" Assassin (Code/Obfuscation)
Concept: Hiding a flag in the spaces and tabs of a source code file.
The Ques: "We found this Python script. It runs perfectly, but the developer says the flag is literally 'nothing.' They mean that literally."
The Method:
Use the Whitespace Programming Language.
This language uses only spaces, tabs, and newlines to represent code.
Paste the "Invisible" code into a normal Python script as a comment.
The Soln: When the player opens the file, it looks like a normal script. However, if they highlight the code, they will see weird patterns of tabs and spaces. They must use a Whitespace interpreter to decode it.
Hint: "Between the lines and within the gaps, the invisible speaks."
Ans: isteCTF{1nv1s1ble_wh1t3sp4ce}



	QUESTION-
The Ques: "This audio file sounds like static or a weird synthesizer. But if you 'look' at the sound rather than listening to it, the visual pattern reveals the key."
The Method: 1. Go to an Online Spectrogram Generator. 2. Upload an image of your flag (e.g., isteCTF{s33_th3_s0und}). 3. The tool generates a .wav file that, when played, sounds like digital noise.
The Soln: Players must open the file in Audacity, click the track name, and select "Spectrogram View." The flag will appear as a drawing made of sound frequencies.
Ans: isteCTF{s33_th3_s0und}
https://drive.google.com/file/d/1Ls9bQZXuUFq1mxAHJrTQJbnHJIE5v7XR/view?usp=drive_link
QUESTION -


The "Protocol Tunnel" (Network + Crypto)
Concept: Hiding data inside the ID fields of a Ping request.
The Question: "Our firewall blocked a series of pings from an unknown source. The packets look standard, but the 'Sequence Number' field is behaving very strangely. It’s almost like it's talking to us in Hex."
The Setup:
Normally, a Ping (ICMP) packet has an ID or Sequence number that goes 1, 2, 3...
You manually craft 10 packets where the Sequence Number is the Hex value of the flag letters.
Packet 1 Sequence: 69 (i), Packet 2 Sequence: 73 (s), Packet 3 Sequence: 74 (t)...
Why it's hard: Automated tools won't find this. Players have to open the .pcap in Wireshark and look at the specific header fields of each packet, then manually convert the numbers to ASCII.
Solution: Filter for ICMP -> Export Packet Dissections -> Convert Sequence IDs to Text.
Flag: isteCTF{p1ng_p0ng_pr0t0c0l}
https://drive.google.com/file/d/1NMNPh4PchneqFKFCVWUiwmnEYvzY9KLw/view?usp=drive_link

QUESTION

The "Nested Binary" (Forensics + Architecture)
Concept: Hiding a file inside the Metadata of a Compiled Binary.
The Question: "We found a Linux executable file that just prints 'Hello World'. But the file size is 5MB. That’s a lot of space for two words. Can you find the 'Section' that doesn't belong?"
The Setup:
Compile a simple C++ program.
Use a tool called objcopy to add a custom section to the binary called .secret_vault.
Inside that section, embed an entire encrypted ZIP file.
Why it's hard: Most players will run strings on the file and find nothing. They have to use professional tools like Ghidra or readelf to see that there is a non-standard memory section.
Solution: Use objcopy --dump-section .secret_vault=output.zip to extract the hidden data.
Flag: isteCTF{0bj_c0py_is_ninja}
https://drive.google.com/file/d/1mAw9V8BSVti2JAYvJ_S-FgUdMu90GwMg/view?usp=drive_link

The "Color-Coded Logic" (Steganography + Programming)
Concept: Using the Least Significant Bit (LSB) of specific pixels to hide a binary message.
The Question: "This image of the Thapar University gate looks perfectly normal. Even if you turn up the brightness, nothing changes. But the red channel has a slight 'shiver' in its values."
The Setup:
Take a high-res photo.
Change the Red value of the first 20 pixels by just 1 unit (e.g., from 255 to 254) if the bit is 1, and leave it if it's 0.
This is a classic "LSB Steganography" attack.
Why it's hard: It is visually impossible to see. Players must write a Python script using the PIL (Pillow) library to extract the last bit of every pixel's Red value and join them into a string.
Solution: Write a script to iterate through pixels -> bin(r)[-1] -> Join bits -> Convert to ASCII.
Flag: isteCTF{lsb_p1x3l_m4n1pul4t10n}
https://drive.google.com/file/d/1xmQMnqsazQPTr7_cZb5iM-MV26m0ORIU/view?usp=drive_link


QUESTION-
"The Double Agent" (Network + Custom Cipher)
This uses network traffic to hide pieces of a custom algorithm.
Layer 1 (The PCAP): Provide a .pcap file. Inside, there are HTTP requests to random sites. The User-Agent string in each request is slightly different.
Request 1: User-Agent: Mozilla/5.0... (Part1: "XOR_")
Request 2: User-Agent: Mozilla/5.0... (Part2: "KEY_")
Request 3: User-Agent: Mozilla/5.0... (Part3: "0x42")
Layer 2 (The Python Script): Inside the same PCAP, there is a "Data" packet (FTP or Exportable object) containing an encrypted text file and a broken Python script.
Layer 3 (The Fix): The Python script is missing the logic to use the XOR key found in Layer 1. The player must assemble the key from the User-Agents and fix the script to decrypt the file.
https://drive.google.com/file/d/1aLLmMIPymhqoM2EOSNnORreBFTL0kuqt/view?usp=drive_link
Question-
"The Russian Doll" (Disk Image + Hidden Partition + Offset Logic)
In this challenge, you provide a file that looks like a corrupted .img (Disk Image) file.
Layer 1: The Magic Byte Fix
The player receives disk.img. It won't mount. They have to open it in a Hex Editor and realize you’ve swapped the first 4 bytes.
The Fix: Change the header to match a 7-Zip or ISO header.
Layer 2: The "Hidden in Plain Sight" Directory
Once they open the archive, they find 1,000 folders named 001, 002... 1000.
The Trick: Inside one folder is a file named hint.txt. Inside another is key.part1. AI can't help here; the player has to use a command like grep -r or find to scan the mess.
Layer 3: The Steganographic Offset
The "Flag" they find is isteCTF{not_the_real_flag}. This is a decoy!
The Real Solution: At the very end of the hint.txt file, there are coordinates: Row 500, Byte 12.
The player has to go back to the original hex of the disk.img, go to that exact location, and find the real flag hidden in the "Slack Space" (the empty space between files).
Question Text:
"We recovered this fragment from a wiped hard drive. Our automated tools say it's just random noise, but we found a note saying 'The truth is buried 10 units from the start, but the map is hidden in the folders.' Can you find the real flag?"
Hint:
"Don't believe every flag you see. If the file header looks like 'data', maybe the real file starts a bit further down the road."
https://drive.google.com/file/d/1DzDn_JOM3azwE5DMULlt4LogGqhADpZ_/view?usp=drive_link

QUESTION-	
The Question:
"The file is broken. The password is lost. The flag is buried. You have 3 layers of security to peel back. Can you find the 'Ghost in the Image'?"
https://drive.google.com/file/d/1x65T0p9l0TNbtpcck1CAWSRceIOhrOaH/view?usp=drive_link

Phase 1: Fixing the "Corrupted" File
The player will notice the file doesn't open. They must use a Hex Editor (like Hex Fiend on Mac or hexed.it online).
Observation: The first 4 bytes are 00 00 00 00.
The Fix: Change them to the standard PNG "Magic Bytes": 89 50 4E 47.
Result: The image now opens and looks like a normal picture.

Phase 2: Finding the Hidden Archive
The file size is too large for a simple image. The player must "extract" the hidden data.
Command: Run unzip mystery.png or binwalk -e mystery.png.
The Lock: A password prompt appears.
The Hint: By running tail mystery.png or strings mystery.png, the player finds:
HINT: The password is the name of our college in lowercase followed by _2024
The Password: thapar_2024
Result: They extract a folder containing final_layer.txt.

Phase 3: Peeling the "Encoding Onion"
Opening final_layer.txt shows a Base64 string. They must decode it in three steps:
Step 1: Base64 to Hex Run: base64 -d final_layer.txtOutput (Example): 62666772... (a long string of numbers and letters)
Step 2: Hex to Rot13 The player must convert that hex string back to ASCII.Output: vfgrePGS{a3fg3q_z4ge3el0fuxn_q0yy}
Step 3: Rot13 to Plaintext Using a Rot13 decoder (shifting letters by 13 places):
v $\rightarrow$ i
f $\rightarrow$ s
g $\rightarrow$ t
r $\rightarrow$ e

Final Flag
isteCTF{n3st3d_m4tr3ry0shka_d0ll}
QUESTION-
 Que.sys_data. (Note: Since it starts with a dot, it might be hidden in their folder; they need to use ls -a to see it).

Phase 4: The Hex Core
Opening .sys_data reveals a string like 69737465435446.... This is the flag represented in Hexadecimal.
The Command:
Bash
xxd -r -p .sys_data
(-r tells xxd to reverse, -p telstion:
"We found this image on a dark-web server. Our analysts extracted a file, but it led to a wall. Then another wall. It’s onions all the way down. Can you reach the core?"
The Hint:
"Passwords are sequential: layer1, layer2... and don't forget that Hex is just another way to speak English."
https://drive.google.com/file/d/1WUgUuRqGF0tU8KKhs4dRAt5lHFLY90hy/view?usp=drive_link
Since this is the "7-Layer Deep Web" challenge, the solution is a recursive process of "unwrapping" different data formats.
Here is the step-by-step walkthrough for the participant (and for you to verify):
Phase 1: The Polyglot Extraction
The file extreme_mystery.png looks like a picture, but it’s a "sandwich" of an image and a ZIP.
The Command: The player runs unzip extreme_mystery.png (or uses a tool like 7-Zip or Binwalk).
The Lock: A password prompt appears for first_layer.txt.
The Key: Based on your hint ("opposite of start1"), the player enters: layer1.
The Result: They now have a file named first_layer.txt.

Phase 2: The Base64 "Tunnel"
Opening first_layer.txt reveals a long string of random alphanumeric characters ending in ==. This is a classic Base64 signature.
The Command: ```bash base64 -d first_layer.txt > recovery.zip
The Result: The text file is converted back into a binary file, which is actually another ZIP archive.

Phase 3: The Second Vault
Now the player has recovery.zip. This is the second "Russian Doll."
The Command: unzip recovery.zip
The Lock: Another password prompt appears for .sys_data.
The Key: Following the sequential hint, the player enters: layer2.
The Result: They extract a hidden file named ls it the input is plain hex).

The Final Flag
isteCTF{w3_n33d_t0_g0_d33p3r_99}


Question-
The Challenge: "The Needle in the Haystack" (Log Forensics + Multi-Key XOR)
Instead of one file, you provide a huge "Server Log" file (thousands of lines). Hidden inside this log are pieces of a flag, but they are encrypted using a rotating key.
The Setup:
The Log: A file with 5,000 lines of fake "Server Traffic."
The Fragments: The flag is split into 5 pieces: isteCTF{, log_, m1n1ng_, is_, t3d10us}.
The Encryption: Each piece is hidden in a different "Error 404" log entry, but encoded in Base64.
The Twist: The pieces are NOT in order. The player must find all 5, and then figure out the correct sequence based on "Timestamps" in the log.
How to solve (The Admin Guide):
Command: grep "404" server_access.log
Output: 5 lines of log entries.
Decode:
aXN0ZUNURns= $\rightarrow$ isteCTF{
bG9nXw== $\rightarrow$ log_
bTE0MW5nXw== $\rightarrow$ m1n1ng_
aXNf $\rightarrow$ is_
dDNkMTB1c30= $\rightarrow$ t3d10us}
Reassemble by Time:
10:16:40 (Piece 1)
10:50:00 (Piece 2)
11:23:20 (Piece 3) ... and so on.
https://drive.google.com/file/d/1lBmdHlvIqguVpUpCSe5C4IeMopq0_TlX/view?usp=drive_link

QUESTION-The Challenge: "The Entropy Sink"
The File: A 10MB binary file called data.bin.
The Content: 9.99MB of it is pure random noise.
The Secret: The flag is hidden at a random offset, but it has been XOR-encrypted with a key that changes based on a mathematical sequence (Prime Numbers).
The Distraction: We will hide 10 "Fake Flags" that look like isteCTF{...} but are actually rickrolls or dead ends.
How to solve (Admin Guide):
If a student is smart, they will write this script:
Python
def is_prime(n):
    if n < 2: return False
    for i in range(2, int(n**0.5) + 1):
        if n % i == 0: return False
    return True

primes = [p for p in range(100, 1000) if is_prime(p)]
with open('data.bin', 'rb') as f:
    f.seek(7532184)
    chunk = f.read(31) # Length of the flag
    decoded = "".join([chr(chunk[i] ^ (primes[i] % 256)) for i in range(31)])
    print(decoded)
https://drive.google.com/file/d/1IRpagOAm4mApzibZlrfmQ5OoTfXICp0k/view?usp=drive_link

QUESTION-
The 100MB Needle"
We are going to create a 100MB file of random data and hide the flag deep inside it, but we’ll "salt" the file with thousands of fake flags to waste their time.
How to Solve (The Solution for You):
To solve this, a player has to be smart and look for something that doesn't look like the other flags.
Step 1: They notice all the flags are fake_flag_X.
Step 2: They search for Base64 patterns or use a tool like binwalk or bulk_extractor.
Step 3: They find the string aXN0ZUNURntmMHIzbnMxY3NfbTRzdDNyXzk5MjF9.
Step 4: echo "aXN0ZUNURntmMHIzbnMxY3NfbTRzdDNyXzk5MjF9" | base64 -d
Result: isteCTF{f0r3ns1cs_m4st3r_9921}
https://drive.google.com/file/d/1ljkt5ZFgnI9H0xrgWFeKsA_iAw0LfU09/view?usp=drive_link


QUESTION-
Layer 1: The Corrupted Archive (The "Magic Byte" Fix)
The participant receives a file named data.bin. It looks like random junk.
The Trick: The file is actually a 7z archive, but the first 32 bytes (the "Magic Bytes") have been overwritten with random data.
The Solution: The user must use a Hex Editor to identify the file structure and manually restore the 7z header (37 7A BC AF 27 1C).
Layer 2: The Steganographic Image (LSB + XOR)
Inside the archive is a single image: pattern.png.
The Trick: The flag isn't in the metadata. It is hidden in the Least Significant Bit (LSB) of the blue channel only.
The Solution: Standard tools might find it, but the extracted string is 0x5A XORed. They must realize the image is a "Visual XOR Key."
Layer 3: The Broken Python Bytecode
Extracted from the image is a .pyc file (Python Bytecode) without the source code.
The Trick: Decompilers (like uncompyle6) will fail because the header version is intentionally mismatched (e.g., a Python 3.12 file labeled as 2.7).
The Solution: The user must fix the bytecode header, decompile it, and read a logic puzzle that generates the final flag based on the local system's time.
solution-Step 1: Use xxd data.bin | head to see the corrupted header. Research "7z magic bytes" and change them back to 37 7A BC AF 27 1C.
Step 2: Open the restored archive to find pattern.png.
Step 3: Use a tool like StegSolve to extract the LSB of the Blue channel.
Step 4: Take that output and run a simple XOR 0x5A operation to reveal the hidden script/flag.
https://drive.google.com/file/d/1pXv8pbeV1T8N4E7Z5Q5PfZd3S3pcZ4a_/view?usp=drive_link

QUESTION-
Challenge Name: The Eternal Loop
Difficulty: Insane
Category: Forensics / Polyglot / OSINT
The Setup (Backward Logic)
The Flag: isteCTF{p0lygl0t_m4st3r_2026_xl}
The PDF: A PDF containing the flag, locked with a password.
The Password: Hidden in the metadata of the GIF.
The Container: A GIF file that "hides" the PDF data in its footer.
The Solution Path (For the Admin)
Analyze: Student runs strings loop.gif and sees "NOT_A_PDF_MOVE_ALONG." This is a hint that something is hidden.
Extract: Student opens the file in a Hex Editor, finds the PDF header (%PDF-), and deletes everything before it.
Rename: They save the new file as recovered.pdf.
Decrypt: They try passwords until they find p4ti4l4 (which you can hide in the GIF's "Comment" field using a tool like ExifTool).
Final ans-isteCTF{p0lygl0t_m4st3r_2026_xl}
https://drive.google.com/file/d/1XAtrfx5oP1siFOpTIacq469H5H64OlZI/view?usp=drive_link

QUESTION-
Challenge Name: The Chromatic Vault
Difficulty: Very Hard / Insane
Category: Steganography / File Format Analysis
The Concept
The Container: An indexed PNG image.
The Secret: A second, smaller image or a text file.
The Method: We will inject the secret data into the unused bytes of the PNG's color palette chunk.
The Solution Path (For the Admin)
Inspection: The student runs strings vault.png. Because the palette data is stored as raw bytes, the flag isteCTF{...} will appear in the text output.
Hex Analysis: If they use a Hex Editor, they will see the flag starting right after the word PLTE.
Final ans-isteCTF{p4l3tt3_p01s0n1ng_4281}
https://drive.google.com/file/d/1OISMonvwopLFBF1lRpHx7yEcivwhJgwW/view?usp=drive_link

QUESTION-Challenge Name: The Packet Sniffer's Regret
Difficulty: Insane
Category: Network Forensics / PCAP / Protocol Analysis
The Concept
The File: A .pcap file (Network Traffic).
The Secret: An FTP (File Transfer Protocol) session.
The Twist: The student will see a user logging in and "uploading" a zip file. However, the zip file itself is corrupted in the packets.
The Flag: Inside the zip file.
The Solution Path (For the Admin)
Open: Student opens capture.pcap in Wireshark.
Analyze: They right-click any packet and select Follow > TCP Stream.
Discover: They see the username admin and the password Admin_P4ss_99.
Extract: Since the "Zip" file in this simulation is actually just the flag hidden at the end of the file, they can find it by looking at the Strings or the Raw Hex at the very bottom of the capture.
Final ans-isteCTF{p4ck3t_h4ck3r_n01_2026}
https://drive.google.com/file/d/16tY-j-q0ywwb8ipJA8cu42q9_hoUdgrX/view?usp=drive_link

QUESTION-
Challenge Name: The Ghost Partition
Difficulty: Insane
Category: Disk Forensics / Mounting / File Systems
The Concept
The File: drive_backup.img.
The Secret: A hidden folder structure inside a raw disk image.
The Twist: The "Flag" is split into three parts, hidden in the Metadata, a Hidden File, and the Volume Label.
The Solution Path (For the Admin)
Identify: Student runs file drive_backup.img and sees it is "data."
Hex Analysis: They find Part 1 at the very top.
Strings Analysis: They run strings -n 10 drive_backup.img to find Part 2 in the middle.
Deep Scan: They must look at the tail of the file (using tail -c 50 drive_backup.img) to find Part 3.
isteCTF{f0r3ns1c_d1sk_m0unt_m4st3r_2026}
https://drive.google.com/file/d/1TLXBm2v2YRdnOcJdqDZscUyHJh6uPdJD/view?usp=drive_link
QUESTION-
3_2026}Challenge Name: The Volatile Secret
Difficulty: Insane
Category: Memory Forensics / RAM Analysis
The Concept
The File: system_dump.mem.
The Secret: A flag that has been "obfuscated" using a simple ROT13 cipher (a common malware technique) and hidden amidst thousands of lines of fake system strings.
The Twist: The student will find a clue in the memory dump that says: "The key is hidden in the rotation of 13 planets."
The Solution Path (For the Admin)
Scanning: Student runs strings system_dump.mem.
Hint Finding: They find the sentence: "The key is hidden in the rotation of 13 planets."
Discovery: They search for anything looking like a flag (starts with vfgrePGS) and find the ROT13 string.
Deciphering: They use a tool like CyberChef or a simple script to rotate the letters back 13 spaces to reveal:
isteCTF{m3m0ry_d3lt4_v0l4t1l
https://drive.google.com/file/d/1T7bzIugUoBfZkO3VikKtOyI4lYv7WMCa/view?usp=drive_link

QUESTION-Challenge Name: The Logic Labyrinth
Difficulty: Insane
Category: Reverse Engineering / JavaScript Obfuscation
The Concept
The File: security_check.html.
The Secret: The flag is hidden inside a heavily obfuscated JavaScript function.
The Twist: The script uses "Dead Code Injection" and "Control Flow Flattening." This means 90% of the code does nothing, and the logic jumps around randomly to confuse both the student and AI tools.
The Solution Path (For the Admin)
Observation: Student opens the HTML file and looks at the <script> tag.
Extraction: They find the array _0x91b = [107, 123, 118, ...].
Reverse Engineering: They notice the line _0x91b[i] ^ 42.
Decoding: They take the numbers and XOR each one with 42 to reveal the ASCII characters of the flag.
The Final Flag
isteCTF{js_0bfusc4t10n_1s_4rt_2026}
https://drive.google.com/file/d/1jeqcox0Zmf3xsBO26fCiT_ZTz4hXUr9b/view?usp=drive_link

QUESTION-Challenge Name: The Ghost in the Static
Difficulty: Insane
Category: Audio Forensics / Spectrogram Analysis
The Concept
The File: signal.wav.
The Secret: If a student listens to the file, they hear only annoying static or a "dial-up" screeching sound.
The Twist: The flag is hidden in the frequencies. To see it, the student must use a tool to view the audio's Spectrogram.
The Solution Path (For the Admin)
Open: Student opens signal.wav in Audacity.
Analyze: They click the dropdown arrow next to the track name and select "Spectrogram".
Discovery: They will see vertical bars and patterns that form the "data" of the flag.
Note: In this simulated script, I've pulsed the frequency. For a real production CTF, you'd usually use a tool like 'Coagula' to turn an image into sound, but this script creates the forensic 'fingerprint' they need to find.

Final ans-isteCTF{h34r_th3_v1su4ls_9921}
https://drive.google.com/file/d/136u6QBPrmwz0zHaeEWj783L_Ifo8Boc2/view?usp=drive_link
QUESTION-Challenge Name: The Metadata Manifest
Difficulty: Hard
Category: Document Analysis / Compressed File Forensics
The Concept
The File: Report_2026.docx.
The Secret: The flag is hidden inside a file called secret.xml tucked deep inside the internal folder structure of the Word document.
The Twist: If the student just reads the document in Word or Google Docs, they will find nothing. They have to "unzip" the document to see the hidden guts.
The Solution Path (For the Admin)
Identify: Student notices the file size is a bit large for one sentence.
Inspect: They run binwalk Report_2026.docx or unzip -l Report_2026.docx.
Find: They see a file they don't recognize: word/theme/secret.xml.
Capture: They extract that specific file and read the flag.
The Final Flag
isteCTF{un_z1pp3d_d0cum3nt_r3v34l_992}
https://docs.google.com/document/d/1AX8CaLEixylXGxhf9scfUtCz6y8TOM-w/edit?usp=drive_link&ouid=105911392256728306155&rtpof=true&sd=true





SAKSHAM MAHAJAN
The "Social Media" Ghost (Web/OSINT)
Concept: Hiding data in plain sight using a fake Instagram or LinkedIn post screenshot.
The Ques: "Our lead developer posted a screenshot of his new workspace, but he didn't realize his 'Pastebin' was visible in the reflection of his monitor. Find the link, find the flag."
The File: Create a high-res photo of a desk. In the background, on a blurry laptop screen or a sticky note, write a partial URL (e.g., pastebin.com/xYz123).
Hint: "Enhance the background. Sometimes the most important info isn't the subject of the photo, but what's sitting on the desk."
Ans: isteCTF{0SINT_is_w4tching}
Soln: Players must zoom into the image, transcribe the URL, and visit the site to find the flag.
https://drive.google.com/file/d/1smGrYO-JJuBJBI4gCJ5zia3-fcnJvuWo/view?usp=drive_link
The "Deep Fried" Image (Stego/Color Levels)

Concept: Using "Invisible" color contrast.
The Ques: "This image looks like a solid black square. Some say it's modern art; we say it's a cover-up. Can you bring the light to the darkness?"
The Method:
Open Photoshop or Canva. Create a black background (Hex: #000000).
Write the flag in a color that is almost black (Hex: #010101).
Save as a .png (lossless).
The Soln: The player must open the image in an editor and crank the "Exposure" or "Brightness" to 100%. Suddenly, the hidden text will pop out from the black background.
Hint: "Shadows hide the truth. Sometimes you just need to turn up the lights."
Ans: isteCTF{l1gs://drive.google.com/file/d/1nqAh-Euhhm-R7jOldEGBTBK_kVyrXXc5/view?usp=drive_linkht_in_th3_dark}
http


[KRISH GUPTA]
Ques:
 An old voicemail from the past has resurfaced. At first, it sounds like meaningless noise—but history has a habit of repeating itself. Can you hear what time tried to hide?
 (Audio link) https://drive.google.com/file/d/1nRcNWD1Bu51A09Fkbrll8uWMMKudxRnz/view?usp=sharing
Ans:
 isteCTF{r3v3r53_th3_p4st}
Hint:
 The message isn’t missing… it’s just moving in the wrong direction. Time itself might be your enemy.
Soln:
 Reverse the audio using Audacity / AudioMass → Adjust speed if needed → Decode the reversed spoken message.
Ques:
 You recovered an image file from a crashed server, but it refuses to open. Logs suggest the identity of the file was wiped. Can you heal it and see what’s inside?
 (Image file provided) top_secret.png
Ans:
 isteCTF{h34d3r_h34l3r}
Hint:
 Every file has a signature. Without it, the system doesn’t know what it is.
Soln:
 Open file in hex editor → Compare PNG/JPG magic bytes → Fix header → Open image → Flag visible.
Ques:
 A historian left behind a message, but spacing and punctuation were erased by time:
Pxtfbrt{qlk_vhgl_vw_ylvlel}

Can you restore its meaning?
Ans:
 isteCTF{old_things_still_work}
Hint:
 Not all ciphers are ancient—some just shift perspectives.
Soln:
 Identify Caesar cipher → Try shifts → Decode readable text → Replace flag format.
Ques:
 Two posters from different eras look identical. But has history been edited? Find the anomaly.
 (Two images provided)
IMAGE 1 :https://drive.google.com/file/d/1I_0hmSOzzg4BxIM8qFuvLNvLj5f0eOnd/view?usp=sharing
IMAGE 2 :https://drive.google.com/file/d/1JtMfwWMv9X8RDZ0w6j8JPN-eUaGO3C_I/view?usp=sharing
Ans:
 isteCTF{sp0t_th3_ch4ng3}
Hint:
 Your eyes may miss it. Machines won’t.
Soln:
 Use online image diff tools or layer images in an editor → Highlight differences → Extract hidden text.
Ques:
 An ordinary photograph from an old archive holds a secret written between pixels. Can you read the invisible ink?
 (Image provided)
https://drive.google.com/file/d/1jBTB2SYYBz0nYh0EFOTrDh4ZMqLN8rOj/view?usp=sharing
Ans:
 isteCTF{h1dd3n_pl4n3s}
Hint:
 What you see isn’t what’s stored.
Soln:
 Use steganography tool (Steghide / StegOnline) → Extract hidden data → Convert hex/text if required.
HARD LEVEL QUESTIONS :
Ques:
 An image recovered from an obsolete system looks normal—but legends say it contains another file inside a file inside a file. How deep does time go?
 (Image provided)
https://drive.google.com/file/d/1tJZbgVcojKX0FNWBCNnoFxHKsHwhyAja/view?usp=sharing
Ans:
 isteCTF{l4y3rs_0f_t1m3}
Hint:
 If one tool gives you something… try opening that too.
Soln:
 Run binwalk → Extract embedded file → Possibly ZIP or image → Repeat → Find flag text/image.
Ques:
 This broadcast was captured decades ago. The voice is distorted, the message unclear—but patterns remain.
 (Audio file)
https://drive.google.com/file/d/1OUG1uTlha1qPLVE3uS4v9Z2fz9mMck0i/view?usp=sharing
Ans:
 isteCTF{fr3qu3ncy_m4tt3rs}
Hint:
 Sound isn’t just sound—it’s math.
Soln:
 View audio spectrogram in Audacity → Hidden text visible in frequency view → Decode text
Ques:
 A scanned document from the archives looks innocent. But historians often leave notes where no one looks.
 (Image/PDF provided)
https://drive.google.com/file/d/1SyJyESGmY8rDbUQLmEwSzTPNlNfAbMZB/view?usp=sharing
Ans:
 isteCTF{m3t4d4t4_n3v3r_l13s}
Hint:
 The truth isn’t in the content—it’s in the details.
Soln:
 Use exiftool → Check metadata fields (Author, Comment, Software) → Extract flag.

Ques:
 An archive file refuses to open, claiming corruption. Yet the data is still there. Can you reconstruct the past?
 (File provided)
https://drive.google.com/file/d/1MLwqsxTVo0VK4GtNK7hxH5gVcyF-3bKB/view?usp=sharing
Ans:
 isteCTF{r3p41r_th3_t1m3l1n3}
Hint:
 Corruption doesn’t mean deletion.
Soln:
 Open file in hex editor → Compare with valid ZIP header → Repair bytes → Extract contents → Flag inside
Ques:
 You found a text file that reads:
“The answer is correct, but not yet.”
Everything you extract leads you back here. How do you break the loop?
https://drive.google.com/file/d/1pFP3tNdEt23t1ATdZ9t7-4TVXpbfiCsd/view?usp=sharing
Ans:
 isteCTF{th1nk_0uts1d3_th3_l00p}
Hint:
 Sometimes the flag isn’t hidden in the file—but in how you got there.
Soln:
 Notice file timestamps / naming pattern / checksum → Use that information to form the flag.
UPDATED :
 Ques : You intercepted a corrupted image from a compromised server.
 The image opens normally, but forensic logs suggest the file size is larger than expected.
Something was hidden in plain sight.
Investigate the file carefully. The truth is appended, not embedded.
https://drive.google.com/file/d/1vf-fLKZSmw3JPOrkJufe26S3tqfzFJFl/view?usp=sharing
Ans : isteCTF{fr4gm3nt3d_r34l1ty_2026}

Ques A stereo audio file was recovered from an abandoned workstation.
Initial playback reveals nothing unusual — just noise.
But the recovery report says:
“Silence speaks louder in isolation.”
Trust your ears.
Audio file https://drive.google.com/file/d/1WsRDUj-LcKYqF2alO9IfKMWN7xQA_60w/view?usp=sharing
Ans isteCTF{morsecodeftw}

Ques A corrupted log file survived a breach.
Security analysts confirm the payload is encoded — but not once.
Layers protect the truth.
Nothing here is plain text.
Decode carefully.
https://drive.google.com/file/d/1QSONmvvEXtbXTzMRgE-OYs8Lc4gPC9U6/view?usp=sharing
Ans isteCTF{qu4ntum_l00ph0l3}

Ques A seemingly broken PDF was recovered from a compromised machine.
 It refuses to open properly.
Digital forensic logs suggest the file contains appended data beyond the visible document.
Find what lies beneath the phantom layer.
https://drive.google.com/file/d/1mZifnN6Vm6QpGfpkxCHrl2JR-mZ21pVa/view?usp=sharing
Ans isteCTF{pdf_ph4nt0m_l4y3r}
Ques A message was encoded — then encoded again.
 Most stop after one layer.
Don’t.
https://drive.google.com/file/d/13oUoKP_rpgvStpOGUi0Sd9VEWxbrRS1A/view?usp=sharing
Ans isteCTF{d0ubl3_b45364_tr4p}
Ques The only thing recovered from the breach was a SHA256 hash.
No hints. No salts.
Can you recover the original flag?
https://drive.google.com/file/d/1aHxA6DtGlXRX-ibWlJ791IWfvA84Upz0/view?usp=sharing
Ans isteCTF{brut3_f0rc3_m4st3r}
Ques The waveform looks structured but meaningless.
What if the message flows backward in time?
https://drive.google.com/file/d/1IWxZeCnZrl65eKM6rXbdOOjQc9sFEAKg/view?usp=sharing
Ans isteCTF{r3v3rs3_th3_w4v3}
Ques The image looks ordinary.
 The pixels reveal nothing.
But ghosts don’t live in pixels.
https://drive.google.com/file/d/1TUWZeJvsKw88UIoPKyYUHCzTOAbEbr_P/view?usp=sharing
Ans isteCTF{m3t4d4t4_gh0st}
Ques The binary dump contains no readable strings.
 But encryption leaves patterns.
Find the shadow key.
https://drive.google.com/file/d/1zS56br9p0zXmS_2ETAaG-og-wvuQ0I6U/view?usp=sharing
Ans isteCTF{x0r_sh4d0w_crypt}
Ques 
The archive opens.
 Inside is another archive.
How deep does it go?
https://drive.google.com/file/d/1iz2yGANs5wJgfBRY31BTHhfCfOyR0GrS/view?usp=sharing
Ans isteCTF{z1p_1nc3pt10n}
Ques A memory dump fragment was recovered.
 It’s mostly random noise.
But noise sometimes hides signals.
https://drive.google.com/file/d/1NGEcVwTkDlg7xyay_tYFdg4tBJqfjGsW/view?usp=sharing
Ans isteCTF{b1n4ry_gh0st_pr0t0c0l}
SIDDHANT JINDAL
Q-1
The False Melody
Ques:
An audio file proudly reveals a flag—but something feels too easy.

File: anthem.wav
Hint 1: First answers are rarely correct.
Hint 2: Try both channels and the spectrogram.
Soln: Spectrogram shows fake flag → split channels → reversed morse → real flag.
Q-2
Layers of Encoding
Ques:
You decode it once. It still doesn’t make sense.

File: layers.txt
Hint: Try decoding until it becomes readable.
Soln: Base64 → Hex → ASCII → flag.
Q-3
Railroads and Riddles
Ques:
A message jumps tracks in unexpected ways.

File: rail.txt
Hint 1: Count the rails.
Hint 2: Letters travel diagonally.
Soln: Rail Fence cipher → plaintext → flag.
Q-4
The Buried Signal
Ques:
An audio recording contains more than just sound. What you see may matter more than what you hear.

File: signal.wav
Flag format: isteCTF{}

Hint 1: Sound can be visualized.
Hint 2: Look at frequency, not time.
Soln: Audacity → spectrogram → image shows encoded text → decode.
Q-5
Fragments of an Image
Ques:
This image refuses to open properly. Something feels broken—but intentional.

File: corrupt.jpg
Hint 1: Headers matter.
Hint 2: Compare with a valid file.
Soln: Fix JPEG header using hex editor → open image → flag visible.
Q-6
The Double Lock
Ques:
A zip file asks for a password. The password is hidden somewhere nearby.

File: locked.zip, note.txt
Hint: The note isn’t plaintext.
Soln: Decode note (base32) → get zip password → extract → flag.
Q-7
20. The Vanishing Comment
Ques:
A webpage looks clean, but something disappears when rendered.

URL: provided
Hint: Browsers don’t show everything.
Soln: Inspect source → hidden HTML comment → base64 decode → flag.
Q-8
Pixels Within Pixels
Ques:
An image hides something that itself hides something else.

File: nest.png
Hint: Steganography can be recursive.
Soln: Steghide extract → hidden image → binwalk → text file → flag.
Q-9
The Broken Archive
Ques:
This archive refuses to extract completely.

File: damaged.zip
Hint: Data isn’t lost—just fragmented.
Soln: Binwalk → carve embedded zip → extract → base64 decode → flag.

Q-10
Sound of Silence
Ques:
There’s nothing to hear—but plenty to find.

File: silent.wav
Hint: Absence is data.
Soln: Analyze amplitude → binary from silence/no-silence → ASCII → flag.
Q-11
The Rotating Maze
Ques:
The message shifts differently every time.

File: maze.txt
Hint: One cipher feeds another.
Soln: Vigenère → output used as Caesar shift key → final plaintext.
Q-12
Dead Drop
Ques:
Coordinates lead nowhere. Or do they?

File: drop.txt
Hint: Historical maps differ from modern ones.
Soln: Convert coords → old map overlay → landmark name → flag.



Q-13
The Time Capsule
Ques:
The file timestamp is intentional.

File: archive.tar
Hint: Time encodes information.
Soln: Extract → analyze timestamps → map seconds to ASCII → flag.
Q-14
The Split Truth
Ques:
Two files. Two lies. One truth.

File: part1.txt, part2.txt
Hint: XOR reveals consistency.
Soln: XOR both files → plaintext → flag.
Q-15
Echo Chamber
Ques:
Repetition hides meaning.

File: echo.txt
Hint: Frequency matters.
Soln: Count character frequency → map to morse → decode → flag.
Q-16
The Misleading Password
Ques:
The password works… but gives the wrong answer.

File: secure.zip
Hint: Multiple outputs exist.
Soln: Extract → decoy flag → second hidden file → real flag.
Q-17
Audio Alchemy
Ques:
Turn sound into something else.

File: alchemy.wav
Hint: Sound is just data.
Soln: Convert audio to raw → image → stego → text → flag.
Q-18
The Vanishing File System
Ques:
Files appear deleted—but not gone.

File: disk.img
Hint: File carving saves lives.
Soln: Use foremost/autopsy → recover text → flag.
Q-19
The Recursive Key
Ques:
The key is encrypted using itself.

File: recursive.txt
Hint: Bootstrap carefully.
Soln: Known-plaintext attack → derive key → decrypt → flag.
Q-20
The Final Layer
Ques:
Everything you’ve learned so far will be needed.
File: final.bin
Hint: No single tool solves this.
Soln:
Binwalk extract
Hidden audio → spectrogram text
Text is Vigenère
Key from metadata
Decode → final flag
CTF FILES SIDDHANT
























HARSHIL
Ques – Binary Beats
A lo-fi music track was found on a hacker’s laptop.
He said, “Music speaks in bits.”
Audio link provided
Flag format: isteCTF{}
Ans – isteCTF{binaryrhythmdecoded}
Hint – Silence and sound both carry meaning.
Soln –
Observe beeps pattern
Short beep = 0, long beep = 1
Convert binary → ASCII → flag
https://drive.google.com/file/d/1INLzb4vNxDHR3qQiO120miaAKJSAVKkk/view?usp=share_link
Ques:
This image is not what it seems.
Layers within layers hide the real message.
Only those who look beyond pixels will uncover the truth.
Can you extract the hidden flag?
Flag format: isteCTF{...}
Hint (Hard but fair)
The image contains multiple steganography layers.
Not everything is visible in standard stego tools.
Some data is hidden in:
metadata
color channels
appended binary
One layer leads to another.
Think forensic + stego + encoding chain.
🏁 Solution Path (Extreme)
Step 1 – Metadata Inspection
Use: exiftool image.png
Find suspicious base64/hex/comment.
Step 2 – Extract Appended Data
Open image in hex editor (HxD).
Scroll to bottom → detect extra data after image EOF.
Save extracted binary.
Step 3 – Binwalk Analysis
binwalk -e image.png
Extract hidden compressed files.
Step 4 – Channel Steganography
Use zsteg (for PNG):
zsteg image.png
Look for hidden text in LSB.
Step 5 – Encoding Chain
Output will be multi-encoded:
hex → base64 → ascii → maybe reversed
Final Decode
After decoding chain:
isteCTF{ultra_st3g0_m4st3r_1337}









