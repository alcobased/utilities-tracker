


const bnt1 = document.getElementById("btn1");

const handleButton1Click = async (event) => {
    const response = await fetch("/api");
}

bnt1.onclick = handleButton1Click;