$("input").on("change paste keyup", function() {
    if ($(this).val() < 0) {
        $(this).val(0);
    }
});

$("#inputFadeDownVolume").on("change paste keyup", function() {
    if ($(this).val() > 100) {
        $(this).val(100);
    }
});

$("#inputRegularVolume").on("change paste keyup", function() {
    if ($(this).val() > 100) {
        $(this).val(100);
    }
});

