(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) {
    return;
  }
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) {
    processPreload(link);
  }
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") {
        continue;
      }
      for (const node of mutation.addedNodes) {
        if (node.tagName === "LINK" && node.rel === "modulepreload")
          processPreload(node);
      }
    }
  }).observe(document, { childList: true, subtree: true });
  function getFetchOpts(link) {
    const fetchOpts = {};
    if (link.integrity) fetchOpts.integrity = link.integrity;
    if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials")
      fetchOpts.credentials = "include";
    else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
    else fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep)
      return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
})();
let croppieContainer;
function calculateRangeSliderLength(slider) {
  const min = slider.min;
  const max = slider.max;
  const value = slider.value;
  slider.style.background = `linear-gradient(to right, white 0%, white ${(value - min) / (max - min) * 100}%, #ffffff4d ${(value - min) / (max - min) * 100}%, #ffffff4d 100%)`;
  slider.oninput = function() {
    this.style.background = `linear-gradient(to right, white 0%, white ${(this.value - this.min) / (this.max - this.min) * 100}%, #ffffff4d ${(this.value - this.min) / (this.max - this.min) * 100}%, #ffffff4d 100%)`;
  };
}
function uploadImageToCroppie() {
  if (!$(".image-cropper").length) {
    return;
  }
  document.getElementById("upload-image").addEventListener("change", function(event) {
    const $closestPopup = $(this).closest(".popups");
    let reader = new FileReader();
    const $croppie = `<div id="croppie-container"></div>`;
    $closestPopup.find(".js-croppie").append($croppie);
    setTimeout(() => {
      croppieContainer = new Croppie(document.getElementById("croppie-container"), {
        viewport: { width: 200, height: 200, type: "square" },
        boundary: { height: 400 },
        enableResize: true,
        showZoomer: true
      });
      reader.onload = function(e) {
        croppieContainer.bind({
          url: e.target.result,
          zoom: 1
        });
      };
      reader.readAsDataURL(event.target.files[0]);
      $closestPopup.addClass("init-cropper");
      setTimeout(() => {
        calculateRangeSliderLength(document.querySelector(".cr-slider"));
      }, 200);
    }, 300);
  });
}
function saveCroppedImageToTile() {
  if (!$(".image-cropper").length) {
    return;
  }
  document.getElementById("crop-button").addEventListener("click", function(e) {
    e.preventDefault();
    croppieContainer.result({
      type: "base64",
      size: { width: 300, height: 300 }
    }).then(function(croppedImage) {
      $(".js-tile").each(function() {
        const $tile = $(this);
        if ($tile.hasClass("is-active")) {
          $tile.find(".js-crop-image").attr("src", croppedImage);
          $(".popups").removeClass("init-cropper is-visible");
          $(".js-croppie").empty();
          $(".js-tile").removeClass("is-active");
        }
      });
      $(".js-image-to-edit").each(function() {
        const $image = $(this);
        if ($image.closest(".is-cropping-image").length) {
          $image.closest(".is-cropping-image").find(".js-image-to-edit").attr("src", croppedImage);
          $(".popups").removeClass("init-cropper is-visible");
          $(".js-croppie").empty();
          $(".is-cropping-image").removeClass("is-cropping-image");
        }
      });
    });
  });
}
function zoomInOnImage() {
  if (!$(".image-cropper").length) {
    return;
  }
  document.getElementById("zoom-in-button").addEventListener("click", function() {
    croppieContainer.setZoom(croppieContainer.get().zoom + 0.05);
    calculateRangeSliderLength(document.querySelector(".cr-slider"));
  });
}
function zoomOutOnImage() {
  if (!$(".image-cropper").length) {
    return;
  }
  document.getElementById("zoom-out-button").addEventListener("click", function() {
    croppieContainer.setZoom(croppieContainer.get().zoom - 0.05);
    calculateRangeSliderLength(document.querySelector(".cr-slider"));
  });
}
$(".js-toggle-popup").on("click", function(e) {
  e.preventDefault();
  const $target = $($(this).attr("href"));
  $target.toggleClass("is-visible");
  $(this).closest(".js-tile").addClass("is-active");
  $(this).closest(".js-croping").addClass("is-cropping-image");
  if (croppieContainer) {
    $(".popups").removeClass("init-cropper");
    $(".js-croppie").empty();
  }
});
uploadImageToCroppie();
saveCroppedImageToTile();
zoomInOnImage();
zoomOutOnImage();
const filterText = () => {
  const $filters = $(".js-filters").closest(".filters");
  const $filterBtn = $filters.find(".js-toggle-filters");
  const activeFilterText = $(".js-filters").find(".is-active").find("a").text();
  $filterBtn.find("span").text(activeFilterText);
};
$(".js-toggle-filters").on("click", function(e) {
  e.preventDefault();
  const $filtersToggle = $(this);
  $filtersToggle.parent().toggleClass("filters-open").find(".js-filters").stop(true).slideToggle();
  filterText();
});
$(".js-filters a").on("click", function(e) {
  e.preventDefault();
  const $filterBtn = $(this);
  $filterBtn.closest(".js-filters").stop(true).slideUp();
  $filterBtn.closest(".filters").removeClass("filters-open");
  $filterBtn.parent().addClass("is-active").siblings().removeClass("is-active");
  filterText();
});
filterText();
