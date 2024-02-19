const videoElement = document.getElementById('videoElement');
// Define a global variable to hold the OpenAI API key
const OPENAI_API_KEY = 'YOUR_OPENAI_API_KEY'; // TODO: need from OpenAI
const LLM_API_TOKEN = 'YOUR_LLM_API_TOKEN'; // TODO: need from fetch.ai

let stream = null;
let mediaRecorder;
let recordedBlobs;
let audioBlob;

const startRecordingBtn = document.getElementById('startRecordingBtn');
const stopRecordingBtn = document.getElementById('stopRecordingBtn');
const recordAgainBtn = document.getElementById('recordAgainBtn');
const submitBtn = document.getElementById('submitBtn');

async function startCamera() {
    try {
        // Check if a stream is already active and stop it
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        
        // Get video and audio stream from the device
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        
        // Display the stream in the video element
        videoElement.srcObject = stream;
        videoElement.controls = false;
        videoElement.autoplay = true;
        videoElement.hidden = false;
        
        // Hide unnecessary buttons and show the start recording button
        hideButton(stopRecordingBtn);
        hideButton(recordAgainBtn);
        hideButton(submitBtn);
        showButton(startRecordingBtn);
    } catch (error) {
        console.error('Error accessing camera:', error);
        // Handle error (e.g., show message to user)
    }
}

function startRecording() {
    recordedBlobs = [];
    try {
        // Create a MediaRecorder instance with the stream
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' });
        
        // Event handler for when data is available
        mediaRecorder.ondataavailable = handleDataAvailable;
        
        // Start recording with a time interval of 10 milliseconds
        mediaRecorder.start(10);
        console.log('MediaRecorder started', mediaRecorder);
        
        // Show the stop recording button and hide the start recording button
        showButton(stopRecordingBtn);
        hideButton(startRecordingBtn);
    } catch (error) {
        console.error('Exception while creating MediaRecorder:', error);
        // Handle error (e.g., show message to user)
    }
}

function handleDataAvailable(event) {
    if (event.data && event.data.size > 0) {
        recordedBlobs.push(event.data);
    }
}

function stopRecording() {
    mediaRecorder.stop();
    console.log('MediaRecorder stopped', mediaRecorder);

    const superBuffer = new Blob(recordedBlobs, {type: 'video/webm'});
    videoElement.srcObject = null; // Disconnect the stream from the video element
    videoElement.src = URL.createObjectURL(superBuffer); // Set the video source to the recorded Blob
    videoElement.controls = true;
    videoElement.autoplay = true;
    videoElement.loop = false;

    stream.getTracks().forEach(track => track.stop()); // Stop the camera stream

    hideButton(stopRecordingBtn);
    showButton(recordAgainBtn);
    showButton(submitBtn);

    // Extract audio from the recorded video
    extractAudio(superBuffer);
}

async function transcribeAudioWithWhisper(audioBlob) {
    const formData = new FormData();
    formData.append('file', audioBlob);
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'text');

    try {
        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
            },
            body: formData,
        });
        const transcript = await response.text();
        console.log('Transcript:', transcript);
        // Generate follow-up questions based on the transcript
        generateSummaryAndFollowUp(transcript);
    } catch (error) {
        console.error('Error transcribing audio with Whisper:', error);
    }
}

async function extractAudio(videoBlob) {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(videoBlob);
    video.onloadedmetadata = async () => {
        const audioContext = new AudioContext();
        const audioDestination = audioContext.createMediaStreamDestination();

        const source = audioContext.createMediaElementSource(video);
        source.connect(audioDestination);

        const recorder = new MediaRecorder(audioDestination.stream);
        const chunks = [];

        recorder.ondataavailable = (e) => chunks.push(e.data);
        recorder.onstop = async () => {
            audioBlob = new Blob(chunks, { type: 'audio/webm' });
            const audioUrl = URL.createObjectURL(audioBlob);

            // Now you can send audioBlob to your speech-to-text API
            await transcribeAudioWithWhisper(audioBlob);
        };

        recorder.start();
        video.play();

        setTimeout(() => {
            recorder.stop();
        }, video.duration * 1000); // Stop recording when the video ends
    };
}

function displaySummaryPage(videoSource, summary, followUpQuestions) {
    // Display the video source
    const videoElement = document.getElementById('summaryVideo');
    videoElement.src = videoSource;

    // Split the summary into an array of lines
    const summaryLines = summary.split('\n');

    // Get the element where we want to display the summary
    const summaryContainer = document.getElementById('summary');

    // Clear any existing content in the summary container
    summaryContainer.innerHTML = '';

    // Create HTML elements for each line of the summary and append them to the container
    summaryLines.forEach(line => {
        const lineElement = document.createElement('p');
        lineElement.textContent = line;
        summaryContainer.appendChild(lineElement);
    });

    // Display the follow-up questions
    const followUpQuestionsList = document.getElementById('followUpQuestions');
    followUpQuestionsList.innerHTML = ''; // Clear previous questions
    followUpQuestions.forEach(question => {
        const listItem = document.createElement('li');
        listItem.textContent = question;
        followUpQuestionsList.appendChild(listItem);
    });
}

async function generateSummaryAndFollowUp(transcript) {
    const videoElement = document.getElementById('videoElement');

    // Default dummy summary and follow-up questions
    let summary = "Ingredients:\n- 4 large eggs\n- 2 medium tomatoes\n" +
    "- 1/2 onion, finely chopped\n- 2 cloves garlic, minced\n- Salt and pepper to taste\n" +
    "- 1 tablespoon soy sauce\n- 1 tablespoon oyster sauce\n- 1 tablespoon Grandma's secret sauce\n" +
    "- 2 tablespoons vegetable oil\n\nInstructions:\n1. Crack the eggs into a bowl and beat lightly with a fork. Set aside.\n" +
    "2. Heat 1 tablespoon of vegetable oil in a non-stick skillet over medium heat.\n" +
    "3. Add the beaten eggs to the skillet and cook until they are just set. Remove from the skillet and set aside.\n" +
    "4. In the same skillet, heat the remaining tablespoon of vegetable oil over medium heat.\n" +
    "5. Add the chopped onion and minced garlic to the skillet. Cook until fragrant and translucent, about 2 minutes.\n" +
    "6. Dice the tomatoes and add them to the skillet. Cook until softened, about 5 minutes.\n" +
    "7. Season the tomato mixture with salt and pepper to taste.\n" +
    "8. Add the cooked eggs back to the skillet, breaking them up into smaller pieces.\n" +
    "9. Stir in the soy sauce, oyster sauce, and Grandma's secret sauce.\n" +
    "10. Cook for an additional 2-3 minutes, stirring occasionally, until everything is heated through and well combined.\n" +
    "11. Serve hot with steamed rice or crusty bread. Enjoy!";
    let followUpQuestions = [
        "What are the ingredients?",
        "Could you explain step 3 in more detail?",
        "What's the cooking time for this recipe?",
        "Are there any substitutions for ingredient X?",
        "How do I know when the dish is done cooking?"
    ];

    const summaryBody = {
        "model": "mistral-v0-7b-instruct",
        "header": "You are a helpful AI assistant, summarizing user instructions. You follow user instruction as the user wants.",
        "prompt": transcript,
        "complete": "",
        "max_tokens": 200, // Adjust max tokens for longer summaries
        "temperature": 0.5 // Adjust temperature for diversity in the summary
    };

    const followUpBody = {
        "model": "mistral-v0-7b-instruct",
        "header": "You are a helpful AI assistant, generating follow-up questions. You follow user instruction as the user wants.",
        "prompt": transcript,
        "complete": "",
        "max_tokens": 50, // Adjust max tokens for longer follow-up questions
        "temperature": 0.5 // Adjust temperature for diversity in the questions
    };

    // Call the API to generate summary and follow-up questions
    try {
        // Generate summary
        const summaryResponse = await fetch("https://agentverse.ai/v1beta1/engine/llm/completion", {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${LLM_API_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(summaryBody)
        });
        const summaryData = await summaryResponse.json();
        summary = summaryData.choices[0].text.trim();

        // Generate follow-up questions
        const followUpResponse = await fetch("https://agentverse.ai/v1beta1/engine/llm/completion", {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${LLM_API_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(followUpBody)
        });
        const followUpData = await followUpResponse.json();
        followUpQuestions = followUpData.choices.map(choice => choice.text.trim());

        // Display the summary and follow-up questions on the page
        displaySummaryPage(videoElement.src, summary, followUpQuestions);
    } catch (error) {
        console.error('Error generating summary and follow-up questions with LLM:', error);
        // Use default dummy data if API calls fail
        displaySummaryPage(videoElement.src, summary, followUpQuestions);
    }
}

recordAgainBtn.addEventListener('click', () => {
    recordedBlobs = []; // Clear previous recordings
    startCamera();
});

submitBtn.addEventListener('click', async () => {
    // Display a message to indicate that the video has been submitted
    alert('Thank you for submitting your video.');

    // Hide the video recording section
    const containers = document.getElementsByClassName('container');
    if (containers.length > 0) {
        containers[0].style.display = 'none';
    } else {
        console.error("No element with the 'container' class found.");
    }

    // Show the summary page
    document.getElementById('summaryPage').style.display = 'block';

    // Scroll to the summary page
    document.getElementById('summaryPage').scrollIntoView({ behavior: 'smooth' });

    // Generate summary and follow-up questions
    await generateSummaryAndFollowUp();
});

startRecordingBtn.addEventListener('click', startRecording);
stopRecordingBtn.addEventListener('click', stopRecording);

function showButton(button) {
    button.style.display = 'inline-block';
}

function hideButton(button) {
    button.style.display = 'none';
}

startCamera(); // Initial call to start the camera
