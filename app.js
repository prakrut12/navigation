document.addEventListener('DOMContentLoaded', () => {
  // Map zoom controls
  const mapViewport = document.getElementById('map-viewport');
  const zoomInBtn = document.getElementById('map-zoom-in');
  const zoomOutBtn = document.getElementById('map-zoom-out');
  const zoomResetBtn = document.getElementById('map-zoom-reset');
  const mapIframe = mapViewport ? mapViewport.querySelector('iframe') : null;
  let currentScale = 1;
  let translateX = 0;
  let translateY = 0;
  const minScale = 0.8;
  const maxScale = 3.0;
  const step = 0.1;

  function applyMapTransform() {
    if (!mapIframe) return;
    mapIframe.style.transform = `translate3d(${translateX}px, ${translateY}px, 0) scale(${currentScale})`;
  }

  if (zoomInBtn && zoomOutBtn && zoomResetBtn && mapIframe) {
    zoomInBtn.addEventListener('click', () => {
      currentScale = Math.min(maxScale, +(currentScale + step).toFixed(2));
      applyMapTransform();
    });
    zoomOutBtn.addEventListener('click', () => {
      currentScale = Math.max(minScale, +(currentScale - step).toFixed(2));
      applyMapTransform();
    });
    zoomResetBtn.addEventListener('click', () => {
      currentScale = 1;
      translateX = 0;
      translateY = 0;
      applyMapTransform();
    });
  }

  // Pointer-based pan and pinch-zoom support
  if (mapViewport && mapIframe) {
    const activePointers = new Map();
    let lastMidpoint = null;
    let lastDistance = null;
    let isPanning = false;
    let panStart = { x: 0, y: 0 };
    let panOrigin = { x: 0, y: 0 };

    function getMidpoint(p1, p2) {
      return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    }

    function getDistance(p1, p2) {
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      return Math.hypot(dx, dy);
    }

    function viewportPointToIframeSpace(point) {
      // Convert viewport coordinates to iframe-local considering current transform
      const rect = mapViewport.getBoundingClientRect();
      const x = point.x - rect.left - translateX;
      const y = point.y - rect.top - translateY;
      return { x: x / currentScale, y: y / currentScale };
    }

    mapViewport.addEventListener('pointerdown', (e) => {
      mapViewport.setPointerCapture(e.pointerId);
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (activePointers.size === 1) {
        // Start panning
        isPanning = true;
        panStart = { x: e.clientX, y: e.clientY };
        panOrigin = { x: translateX, y: translateY };
      } else if (activePointers.size === 2) {
        // Start pinch
        const [p1, p2] = Array.from(activePointers.values());
        lastMidpoint = getMidpoint(p1, p2);
        lastDistance = getDistance(p1, p2);
        isPanning = false;
      }
    });

    mapViewport.addEventListener('pointermove', (e) => {
      if (!activePointers.has(e.pointerId)) return;
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (activePointers.size === 1 && isPanning) {
        const dx = e.clientX - panStart.x;
        const dy = e.clientY - panStart.y;
        translateX = panOrigin.x + dx;
        translateY = panOrigin.y + dy;
        applyMapTransform();
      } else if (activePointers.size === 2) {
        const [p1, p2] = Array.from(activePointers.values());
        const midpoint = getMidpoint(p1, p2);
        const distance = getDistance(p1, p2);
        if (lastDistance && distance) {
          const scaleFactor = distance / lastDistance;
          const newScale = Math.min(maxScale, Math.max(minScale, currentScale * scaleFactor));

          // Zoom about the gesture midpoint
          const before = viewportPointToIframeSpace(midpoint);
          currentScale = newScale;
          const after = viewportPointToIframeSpace(midpoint);
          translateX += (after.x - before.x) * currentScale;
          translateY += (after.y - before.y) * currentScale;
          applyMapTransform();
        }
        lastDistance = distance;
        lastMidpoint = midpoint;
      }
    });

    function endPointer(e) {
      activePointers.delete(e.pointerId);
      if (activePointers.size < 2) {
        lastDistance = null;
        lastMidpoint = null;
      }
      if (activePointers.size === 0) {
        isPanning = false;
      }
    }

    mapViewport.addEventListener('pointerup', endPointer);
    mapViewport.addEventListener('pointercancel', endPointer);
    mapViewport.addEventListener('pointerleave', (e) => {
      if (activePointers.has(e.pointerId)) endPointer(e);
    });

    // Wheel zoom (desktop)
    mapViewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = Math.sign(e.deltaY);
      const zoomOut = delta > 0;
      const factor = zoomOut ? (1 - step) : (1 + step);
      const newScale = Math.min(maxScale, Math.max(minScale, currentScale * factor));
      const point = { x: e.clientX, y: e.clientY };
      const before = viewportPointToIframeSpace(point);
      currentScale = newScale;
      const after = viewportPointToIframeSpace(point);
      translateX += (after.x - before.x) * currentScale;
      translateY += (after.y - before.y) * currentScale;
      applyMapTransform();
    }, { passive: false });

    // Double-click / double-tap to zoom in
    mapViewport.addEventListener('dblclick', (e) => {
      const point = { x: e.clientX, y: e.clientY };
      const before = viewportPointToIframeSpace(point);
      currentScale = Math.min(maxScale, currentScale * (1 + 2 * step));
      const after = viewportPointToIframeSpace(point);
      translateX += (after.x - before.x) * currentScale;
      translateY += (after.y - before.y) * currentScale;
      applyMapTransform();
    });
  }
  const arrows = document.querySelectorAll('.carousel__arrow');
  arrows.forEach(btn => btn.addEventListener('click', () => {
    btn.classList.add('clicked');
    setTimeout(() => btn.classList.remove('clicked'), 120);
  }));

  // Chatbot functionality
  const chatbotIcon = document.getElementById('chatbot-icon');
  const chatWindow = document.getElementById('chat-window');
  const closeChatBtn = document.getElementById('close-chat');
  const userInput = document.getElementById('user-input');
  const sendBtn = document.getElementById('send-btn');
  const chatBody = document.getElementById('chat-body');
  const micBtn = document.getElementById('mic-btn');

  let recognition;
  let isListening = false;

  // Function to handle chatbot open/close
  chatbotIcon.addEventListener('click', () => {
    chatWindow.classList.add('open');
    chatbotIcon.classList.add('hidden'); // Hide icon when chat is open
    chatBody.innerHTML = ''; // Clear chat history
    addBotMessage("Hello! I'm GMU AI Assistant. How can I help you navigate today?", "Hello! I'm G M U AI Assistant. How can I help you navigate today?");
  });

  closeChatBtn.addEventListener('click', () => {
    chatWindow.classList.remove('open');
    chatbotIcon.classList.remove('hidden'); // Show icon when chat is closed
    if (isListening) {
        recognition.stop();
        isListening = false;
        micBtn.classList.remove('listening');
    }
    window.speechSynthesis.cancel(); // Stop any ongoing speech
  });

  // Initialize Speech Recognition
  if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      isListening = true;
      micBtn.classList.add('listening');
      userInput.placeholder = "Listening...";
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      userInput.value = transcript;
      handleUserInput();
    };

    recognition.onend = () => {
      isListening = false;
      micBtn.classList.remove('listening');
      userInput.placeholder = "Ask a question...";
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error', event);
      userInput.placeholder = "Error listening, please try again.";
      isListening = false;
      micBtn.classList.remove('listening');
    };

    micBtn.addEventListener('click', () => {
      if (isListening) {
        recognition.stop();
      } else {
        recognition.start();
      }
    });
  } else {
    console.warn('Speech Recognition not supported in this browser.');
    micBtn.style.display = 'none'; // Hide mic button if not supported
  }

  // Function to add a message to the chat body
  function addMessage(sender, message) {
    const messageElement = document.createElement('div');
    messageElement.classList.add(sender === 'user' ? 'message-user' : 'message-bot');
    messageElement.innerHTML = `<div class="message-bubble">${message}</div>`;
    chatBody.appendChild(messageElement);
    chatBody.scrollTop = chatBody.scrollHeight; // Scroll to bottom
  }

  function addBotMessage(message, spokenMessage = message) {
    addMessage('bot', message);
    speakText(spokenMessage); // Use spokenMessage for speech synthesis
  }

  function addUserMessage(message) {
    addMessage('user', message);
  }

  // Text-to-Speech function
  function speakText(text) {
    // Remove HTML tags from the text
    let cleanedText = text.replace(/<[^>]*>/g, '');
    // Replace " / " with " or " for better readability in speech
    cleanedText = cleanedText.replace(/\s\/\s/g, ' or ');
    // Replace any remaining slashes with a space
    cleanedText = cleanedText.replace(/\//g, ' ');

    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  }

  // Location data (case-insensitive and with variations)
  const locations = [
    {
      names: [
        "ADE/MS LAB C-B109",
        "COMPUTER LAB C-B10",
        "CR-03 C-B11",
        "ELECTRICAL DB ROOM C-B12",
        "WEST STAIRS",
        "STAFF ROOM-02(BASIC SCIENCES B-15)",
        "RESEARCH CENTRE B-16",
        "CR-04 C-B17",
        "CR-05 C-B18",
        "CR-06 C-B19",
        "CAD LAB C-B08",
        "DESIGN LAB & MACHINE SHOP C-B20",
        "NORTH STAIRS",
        "STAFFROOM(ED) C-B07",
        "XEROX C-B01A",
        "COOPERATIVE SOCIETY C-B06",
        "STORE C-B01",
        "CR-01",
        "ECE LAB C-B02",
        "FM &ML LAB C-B03",
      ],
      floor: "Basement Floor",
      link: "../0.html",
    },
    {
      names: [
        "Main Entrance",
        "North Entrance",
        "South Entrance",
        "East Entrance",
        "Senior Dean C-024",
        "Principal C-021",
        "Board Room C-023",
        "Office",
        "Office C-020",
        "Staff Room C-013",
        "Chemistry Lab C-001",
        "Physics Lab C-004",
        "Department of Mathematics",
        "Prof & Head dept of ED",
        "Seminar Hall C-017 ED",
        "Training & Placement Cell",
        "Data Center C-031",
        "Windows Lab C-032",
        "Gem Ventures SW-Development C-030",
        "Research Lab C-033",
        "Class Room 13 C-012",
        "Class Room 12 C-011",
        "Class Room 11 C-010",
        "Class Room 10 C-009",
        "Class Room 9 C-005",
        "Staff room Physics C-005",
        "Class Room 7 C-002",
        "Class Room 15 C-026",
        "Class Room 8 C-003",
        "Class Room 16 C-027",
        "Class Room 17 C-028",
        "Class Room 18 C-029",
        "Gents Toilet",
        "Ladies Toilet",
        "Corridor 2.5m",
        "Corridor 2.95m",
        "Stage",
        "Lift",
        "Professor and Head Department of Robotics C-014",
        "Wash room (girls) C-015",
        "Wash room (Boys) C-016",
        "CASP C-019",
        "Management Representative C-022",
        "Class Room 14 C-025",
        "Drinking Water",
      ],
      floor: "Ground Floor",
      link: "../1.html",
    },
    {
      names: [
        "NORTH STAIRS",
        "STAFF-ROOM 8/ CR-123",
        "C-122",
        "C-121",
        "CAD LAB/C-118",
        "LADIES TOILET 1",
        "GENTS TOILET 1",
        "C-117",
        "C-116",
        "C-115",
        "C-114",
        "STAFF ROOM-7 /C-113",
        "GENTS TOILET-2",
        "WEST STAIRS",
        "LADIES TOILET-2",
        "C-109",
        "CS STAFF ROOM-6/C-108",
        "C-107",
        "C-106",
        "C-105",
        "ISE-HOD/C-104",
        "STAFF ROOM-5/C-103",
        "NETWORK LAB/C-102",
        "PROJECT LAB/C-101",
        "SOUTH STAIRS",
        "COMPUTER CENTER/C-140",
        "UPS",
        "STAFF-ROOM-10/C-139",
        "SEMINAR HALL/C-138",
        "ALGORITHMS & OS LAB/C-134",
        "ANALOG & DIGITAL ELECTRONICS LAB/C-135",
        "MICROPROCESSOR & MICROCONTROLLER LAB/C-136",
        "CS STAFF ROOM-7/C-133",
        "C-132",
        "CS HOD ROOM",
        "EAST STAIRS",
        "C-130",
        "C-129",
        "ENVIRONMENTAL LAB/C-126",
        "C-127",
        "C-128",
        "CIVIL SEMINAR HALL",
        "CIVIL HOD ROOM",
      ],
      floor: "First Floor",
      link: "../2.html",
    },
    {
      names: [
        "NORTH STAIRS",
        "AUDITORIUM/C-222",
        "SR-12/C-221",
        "C-217",
        "C-216",
        "WR-218",
        "WR-219",
        "C-220",
        "C-215",
        "C-214",
        "C-213",
        "C-212",
        "WR-210",
        "West Stairs",
        "WR-209",
        "C-208",
        "C-207/ADC LAB",
        "SR-11/EEE",
        "CIRCUIT LAB/205",
        "C-204",
        "EEE HOD/C-203",
        "COMMUNICATION LAB/C-202",
        "C-245",
        "SOUTH STAIRS",
        "C-244",
        "Project-LAB and R&D LAB/C-243",
        "SR-18/C-242",
        "C-241",
        "C-240",
        "C-239",
        "COMPUTER LAB-02",
        "COMPUTER LAB-01",
        "SR-16/C-238",
        "SR-15/C-234",
        "E&C SR-14/S-233",
        "C-232",
        "E&C HOD/C-231",
        "SR-13/AIML",
        "East Stairs",
        "C-229",
        "DataScience Lab/C-228",
        "Neutral NetworkLAB/C-227",
        "DeepLearning-LAB/C-226",
        "STORE ROOM-05",
        "AIML-HOD/C-223",
        "C-224",
      ],
      floor: "Second Floor",
      link: "../3.html",
    },
    {
      names: [
        "RESEARCH LAB",
        "BT LAB+BIOPROCESS",
        "WIDE CORRIDOR",
        "CR-06",
        "CR-05",
        "STAFF ROOM",
        "CR-26",
        "LAB ROOM-07",
        "CR-07",
        "BT LAB-01",
        "CR-08",
        "CR-09",
        "CR-10",
        "CR-11",
        "CR-12",
        "CR-13-48X",
        "BT-CR-02",
        "BT-CR-01",
        "OUT OPEN",
        "CAFETERIA",
        "MBA AUDITORIUM",
        "HOD-BT",
        "BT-CR-03",
        "BT-CR-04",
        "BIOINFOMATICS",
        "NSS/NCC",
        "MBA DIRECTOR",
        "STAFF ROOMS",
        "COMPUTER LAB",
        "LADIES TOILET",
        "BOARD ROOM",
        "EAST STAIRS",
        "NORTH STAIRS",
        "WEST STAIRS",
        "SOUTH STAIRS",
      ],
      floor: "Third Floor",
      link: "../4.HTML",
    },
    {
      names: [
        "MAIN ENTERANCE",
        "ENGINEERING BLOCK",
        "GM INSTITUTE OF PHARMACEUTICAL SCIENCES AND RESEARCH",
        "CENTRAL LIBRARY",
        "GM BAKERY",
        "CANTEEN",
        "LADIES HOSTEL",
        "GENTS HOSTEL",
        "GMS ACADEMY DEGREE COLLEGE(BCA,BCom)",
        "GM HALAMMA PU COLLEGE",
        "ADMIN BLOCK",
        "PLAYGROUND",
        "GANESHA TEMPLE",
        "FLAG AREA",
        "CAR PARKING AREA",
        "GUEST HOUSE",
        "LAWN",
        "CIRCLE",
        "BUSTAND AREA",
      ],
      floor: "Campus Map",
      link: "../BLOCKS.html",
      description: {
        "ENGINEERING BLOCK":
          "The Engineering Block houses various departments including Computer Science, Mechanical, Civil, and Electronics Engineering. It contains state-of-the-art laboratories, classrooms, and faculty offices.",
        "CENTRAL LIBRARY":
          "The Central Library is a knowledge hub with over 50,000 books, journals, and digital resources. It provides a quiet study environment and group discussion rooms.",
        "CANTEEN":
          "The campus canteen offers a variety of nutritious and delicious food options at affordable prices. It\'s a popular spot for students to relax and socialize.",
        "LADIES HOSTEL":
          "The Ladies Hostel provides safe and comfortable accommodation for female students with amenities like Wi-Fi, common room, and 24/7 security.",
        "GENTS HOSTEL":
          "The Gents Hostel offers comfortable living spaces for male students with facilities like recreational rooms, study areas, and dining hall.",
        "ADMIN BLOCK":
          "The Administrative Block houses the university\'s administrative offices including the Registrar, Finance Department, and Principal\'s office.",
        "PLAYGROUND":
          "The university playground features facilities for various sports including cricket, football, basketball, and track events.",
        "GUEST HOUSE":
          "The Guest House provides accommodation for visiting faculty, guests, and parents with well-furnished rooms and modern amenities.",
        "GM INSTITUTE OF PHARMACEUTICAL SCIENCES AND RESEARCH":
          "This institute offers pharmacy programs with modern laboratories, research facilities, and experienced faculty members.",
        "GM HALAMMA PU COLLEGE":
          "The pre-university college offers science, commerce, and arts streams for intermediate education with qualified teaching staff.",
        "GMS ACADEMY DEGREE COLLEGE(BCA,BCom)":
          "The degree college offers undergraduate programs in Computer Applications and Commerce with modern teaching methodologies.",
        "MAIN ENTERANCE":
          "The main entrance to the campus with security checkpost and visitor management system.",
        "GANESHA TEMPLE":
          "A serene temple dedicated to Lord Ganesha, providing a spiritual space for students and staff.",
        "GM BAKERY":
          "The campus bakery offers fresh baked goods, snacks, and beverages for students and staff.",
        "CAR PARKING AREA":
          "Spacious parking area for students, staff, and visitors with capacity for 500 vehicles.",
        "BUSTAND AREA":
          "Designated area for buses with shelters and seating arrangements for students.",
        "LAWN":
          "Beautifully maintained green space with seating areas for students to relax and study.",
        "CIRCLE":
          "Central circular area with decorative elements, often used for gatherings and events.",
        "FLAG AREA":
          "The ceremonial flag area where important events and flag hoisting ceremonies take place.",
      },
    },
  ];

  // Simple fuzzy matching function
  function fuzzyMatch(input, target) {
    const inputLower = input.toLowerCase();
    const targetLower = target.toLowerCase();
    return targetLower.includes(inputLower) || inputLower.includes(targetLower);
  }

  // Function to handle user input
  function handleUserInput() {
    const userText = userInput.value.trim();
    if (userText === '') return;

    addUserMessage(userText);
    userInput.value = '';

    // Handle generic greetings
    const greetingKeywords = ["hi", "hello", "hey", "hi there", "hello there", "hey there"];
    if (greetingKeywords.some(keyword => userText.toLowerCase().includes(keyword))) {
      addBotMessage("Hello, how can I help you today?");
      return;
    }

    let foundLocation = null;
    for (const floorData of locations) {
      for (const locName of floorData.names) {
        if (fuzzyMatch(userText, locName)) {
          foundLocation = { name: locName, floor: floorData.floor, link: floorData.link };
          break;
        }
      }
      if (foundLocation) break;
    }

    if (foundLocation) {
      let spokenMessage;
      let botMessage;

      if (foundLocation.description) {
        spokenMessage = `The location ${foundLocation.name.replace(/\//g, ' or ')} is: ${foundLocation.description.replace(/\//g, ' or ')}. You can click the link in the chat to explore the Campus Map.`;
        botMessage = 
          `The location "${foundLocation.name}" is: <strong>${foundLocation.description}</strong>. ` +
          `<a href="${foundLocation.link}" target="_blank">Click here to explore the Campus Map</a>.`
      } else {
        spokenMessage = `The location ${foundLocation.name.replace(/\//g, ' or ')} is on the ${foundLocation.floor}. You can click the link in the chat to explore the ${foundLocation.floor}.`;
        botMessage = 
          `The location "${foundLocation.name}" is on the <strong>${foundLocation.floor}</strong>. ` +
          `<a href="${foundLocation.link}" target="_blank">Click here to explore the ${foundLocation.floor}</a>.`
      }
      addBotMessage(botMessage, spokenMessage);
    } else {
      addBotMessage("Sorry, I couldn't find that location. Please try rephrasing or check for typos.");
    }
  }

  sendBtn.addEventListener('click', handleUserInput);

  userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleUserInput();
    }
  });

});
