
$(document).ready(function() {
    // Publication hover effects
    $('.publication-mousecell').mouseover(function() {
        $(this).find('video').css('display', 'inline-block');
        $(this).find('img').css('display', 'none');
    });
    $('.publication-mousecell').mouseout(function() {
        $(this).find('video').css('display', 'none');
        $(this).find('img').css('display', 'inline-block');
    });

    // Simple mobile navbar toggle
    $('.navbar-burger').click(function() {
        $('.navbar-burger').toggleClass('is-active');
        $('.navbar-menu').toggleClass('is-active');
    });

    // Close mobile menu when clicking on a link
    $('.navbar-item').click(function() {
        $('.navbar-burger').removeClass('is-active');
        $('.navbar-menu').removeClass('is-active');
    });
})
