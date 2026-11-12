
G.gui = {name:"GUI dashboard", group:"PC software", k:"dat",
 summary:"The GUI dashboard is the desktop window the team and the examiners will watch during measurements. It shows live count rates, the rate history, an event display of the two modules, the angular polar plot against cos²θ and the pulse-height histogram. It also lets you start and stop runs and change settings without touching the firmware.",
 io:["Live records from the logger and stored runs on disk","Plots on screen, run controls, and exported figures and tables"],
 how:[
  "Where its data comes from. The GUI does not read the serial port itself. Several times per second it takes parsed records from the logger's queue and redraws the plots. Finished runs are loaded from the run folders for the polar plot and for comparisons.",
  "Panels. A status bar at the top shows the port, the run name, the elapsed time, the temperature and the bias voltage. Below it, three large number tiles show the singles rates A and B and the coincidence rate over the last minute. The main area holds four plots: the count-rate history (coincidences per minute against time), the polar plot (corrected rate against angle, with the cos²θ curve and the Monte Carlo estimate), the pulse-height histogram (hA and hB), and the event display.",
  "The event display. The brief asks for live event trajectories. The display draws the two modules at the current tilt angle and, for each coincidence, a line through both. With one SiPM per slab the detector cannot tell where in the slab the muon passed, so each line is drawn through a random point in each slab and labelled as illustrative. If the team later divides each slab into strips, real positions can be shown.",
  "Controls. A side panel lets you choose the serial port, enter the run settings (θ, d, absorber), start and stop runs, set the thresholds, switch the temperature compensation on or off, and export the current plots."],
 conn:[["From","The logger's live queue and the run folders on disk."],["To","The screen, exported PNG and CSV files, and commands sent to the MCU through the logger."]],
 specs:["Desktop dashboard with live event trajectories (spec)","Count-rate time histories (spec)","Angular polar plots (spec)","Refreshes at least five times per second without freezing"],
 steps:[
  ["Choose the toolkit","Use PySide6 (or PyQt6) for the window and pyqtgraph for the plots. pyqtgraph is designed for fast live data and handles many thousands of points without slowing down."],
  ["Sketch the layout","Draw the window on paper first: status bar, rate tiles, the four plots and the control panel. Agree on it as a team before writing code."],
  ["Start the logger from the GUI","Run the logger's serial reader in a background thread started by the GUI. Use a QTimer that fires every 200 ms to take new records from the queue and update the plots."],
  ["Build the plots one at a time","Start with the rate tiles and the rate history, which only need STAT lines. Then add the histogram (hA and hB from EVT lines), the polar plot (from analysed runs) and finally the event display."],
  ["Draw the event display","Use a pyqtgraph view with two rectangles for the modules, rotated by θ, and draw each new coincidence as a line that fades out after a few seconds."],
  ["Add the controls","Connect the Start, Stop and threshold controls to the logger, which sends the matching commands to the MCU. Disable controls that must not change during a run, such as θ."],
  ["Add export","Add an Export button that saves each plot as PNG and its data as CSV, with the run name in the file name, ready for the reports."]],
 parts:[["Window toolkit","PySide6 or PyQt6","Mature, free, and runs on Windows, macOS and Linux."],
  ["Plots","pyqtgraph","Fast live plotting built on Qt."],
  ["Alternative","Plotly Dash","A browser-based dashboard, if the team prefers web tools."]],
 test:[["Speed","Replay a recorded file at ten times real speed. The window must stay responsive and the plots must update smoothly."],
  ["Polar plot correctness","Load simulated runs whose rates follow cos²θ exactly. The points must fall on the cos²θ curve."],
  ["Long session","Leave the GUI running for 12 hours. Memory use must stay flat and the plots must keep updating."]],
 pitfalls:[["Implying position resolution","Event trajectories look like particle tracking, but single-slab modules do not measure position. Say so clearly in demos and in the report."],
  ["Redrawing everything","Rebuilding every plot from scratch each frame gets slower as data grows. Update histograms and curves incrementally."],
  ["Blocking the window","Long calculations such as a fit, run in the GUI thread, freeze the window. Run them in a worker thread."]],
 terms:[["Event display","A picture of the detector showing each recorded event."],
  ["Polar plot","A plot in which the angle gives the direction and the rate gives the distance from the centre."],
  ["QTimer","A Qt timer that calls a function at regular intervals inside the GUI thread."]]};

const ORDER = ["overview","muon","stand","absorber","scint","sipm","bias","temp","afe","peak","thr","comp","stretch","coinc","mcu","usb","logger","gui"];
const GROUPS = [
 ["Start here","mu",["overview"]],
 ["Input & mechanics","mech",["muon","stand","absorber"]],
 ["Detector module ×2","opt",["scint","sipm"]],
 ["Power & bias","pwr",["bias","temp"]],
 ["Analog chain ×2","ana",["afe","peak","thr"]],
 ["Timing logic","dig",["comp","stretch","coinc"]],
 ["Acquisition","dat",["mcu","usb"]],
 ["PC software","dat",["logger","gui"]]];
const DOMAINS = [["mu","Muon"],["opt","Scintillation light"],["ana","Analog signal"],["dig","Logic and timing"],["pwr","Bias and power"],["dat","Data and control"],["mech","Mechanical"]];
