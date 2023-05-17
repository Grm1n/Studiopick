$(".profileselect").on("mouseover", function () {
    $(this).parent().parent().addClass("hovered")
  })
  $(".profileselect").on("mouseout", function () {
    $(this).parent().parent().removeClass("hovered")
  })